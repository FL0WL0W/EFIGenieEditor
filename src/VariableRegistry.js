import { throttle } from "lodash-es"
import { objectTester } from "./JavascriptUI/UIUtils"
export default class VariableRegistry extends EventTarget {
    constructor(prop) {
        super()
        Object.assign(this, prop)
        this.CreateIfNotFound = false
        this.dispatchReplaceEvent = throttle(() => { this.dispatchEvent(new CustomEvent(`change`, { detail: { action: `replace` } })) }, 100)
        this.dispatchClearEvent = throttle(() => { this.dispatchEvent(new CustomEvent(`change`, { detail: { action: `clear` } })) }, 100)
        this.dispatchChangeEvent = throttle(() => { this.dispatchEvent(new CustomEvent(`change`, { })) }, 100)
    }
    get variableReferences() {
        var variableReferences = { ...this }
        delete variableReferences.CreateIfNotFound
        return variableReferences
    }
    set variableReferences(variableReferences) {
        Object.assign(this, variableReferences)
        this.dispatchReplaceEvent()
    }
    Clear() {
        Object.entries(this).forEach(([elementname, element]) => {
            if(elementname == `CreateIfNotFound`)
                return
            delete this[elementname]
        })
        this.dispatchClearEvent()
    }
    GenerateVariableId() {
        this.VariableIncrement ??= 0
        return ++this.VariableIncrement
    }
    GetVariableByReference(reference, visitedReferences = new Set()) {
        if(!reference || typeof reference != `object`) return
        reference = { ...reference }
        if(reference.unit) {
            if(reference.type != `enum`)
                delete reference.type
        } else {
            delete reference.unit
        }
        if(visitedReferences.has(reference.name)) return
        visitedReferences.add(reference.name)

        let match = getMatcherForReference(reference)
        

        let dotIndex
        let list = this
        let referenceName = reference.name
        while((dotIndex = referenceName.indexOf(`.`)) != -1) {
            const listName = referenceName.substring(0, dotIndex)
            list[listName] ??= {}
            list = list[listName]
            referenceName = referenceName.substring(dotIndex + 1)
        }

        let variable
        if (typeof list[referenceName] == `object`) {
            const map = list[referenceName]

            if(Array.isArray(map))
                variable = { ...map.find(match), name: reference.name }
            else if(map && match(map))
                variable = { ...map, name: reference.name }
        //variable points indirectly to another variable by name or is directly the id
        } else if (typeof list[referenceName] == `string` || typeof list[referenceName] == `number`) {
            variable = { name: reference.name, id: list[reference.name] }
        }

        if(variable) {
            if(typeof variable.id == `string`) {
                const referencedVariable = this.GetVariableByReference(
                    { name: variable.id, unit: reference.unit ?? variable.unit, type: reference.type ?? variable.type },
                    visitedReferences
                )
                if(referencedVariable)
                    return { ...referencedVariable, name: variable.name }
            }
            return variable
        } else if (this.CreateIfNotFound) {
            this.RegisterVariable(reference)
            visitedReferences.delete(reference.name)
            return this.GetVariableByReference(reference, visitedReferences)
        }
    }
    GetVariableId(reference) {
        let variable = this.GetVariableByReference(reference)
        if(variable) return variable.id
        if(!this.CreateIfNotFound) return
        if(reference == undefined || reference.name == undefined) return
        variable = { ...reference }

        //create variable since it was not found
        variable.id ??= this.GenerateVariableId()

        const dotIndex = variable.name.indexOf(`.`)
        if(dotIndex != -1) {
            const listName = variable.name.substring(0, dotIndex)
            this[listName] ??= {}
            const variableName = variable.name.substring(dotIndex + 1)
            delete variable.name

            const map = this[listName][variableName]
            if(!Array.isArray(map))
                this[listName][variableName] = [ variable ]
            else if(map)
                this[listName][variableName] = [ map, variable ]
            else
                this[listName][variableName] = variable
        } else {
            const variableName = variable.name
            delete variable.name
            const map = this[variableName]
            if(!Array.isArray(map))
                this[variableName] = [ variable ]
            else if(map)
                this[variableName] = [ map, variable ]
            else
                this[variableName] = variable
        }

        return this.GetVariableId(reference)
    }
    RegisterVariable(reference, previousReference) {
        if(!reference || typeof reference != `object` || !reference.name || objectTester(reference, previousReference)) return
        reference = { ...reference }
        //if unit is specified, type is not needed unless it is an enum. we also do not need measurement if unit is specified
        if(reference.unit) {
            if(reference.type != `enum`)
                delete reference.type
            delete reference.measurement
        } else {
            delete reference.unit
        }
        //if measurement is specified, type is not needed unless it is an enum
        if(reference.measurement) {
            if(reference.type != `enum`)
                delete reference.type
        } else {
            delete reference.measurement
        }
        //references not allowed to specify an id unless it is an alias
        if(typeof reference.id == `number`)
            delete reference.id

        const fullName = reference.name
        let previousVariables = this.#RemoveVariable(previousReference)
        if(reference.id == undefined && typeof previousVariables[0]?.id == `number`)
            reference.id = previousVariables[0].id
        if(reference.id == undefined)
            reference.id = this.GenerateVariableId()

        let dotIndex
        let list = this
        let referenceName = reference.name
        delete reference.name
        while((dotIndex = referenceName.indexOf(`.`)) != -1) {
            const listName = referenceName.substring(0, dotIndex)
            list[listName] ??= {}
            list = list[listName]
            referenceName = referenceName.substring(dotIndex + 1)
        }
        const map = list[referenceName]
        if(Array.isArray(map))
            list[referenceName].push(reference)
        else if(map)
            list[referenceName] = [ map, reference ]
        else
            list[referenceName] = reference

        const current = { ...reference, name: fullName }
        previousVariables = previousVariables.filter(previous => previous.name != current.name || previous.unit != current.unit || previous.type != current.type)
        const detail = { action: `update`, reference: current, previousReferences: previousVariables }
        // update all aliases
        if(previousVariables.length > 0) {
            for(const value of Object.values(this)) {
                if(value == undefined)
                    continue
                for(const map of Object.values(map?.name != undefined? { value } : value)) {
                    if(Array.isArray(map)) {
                        for(const variable of map) {
                            if(typeof variable.id == `string` && previousVariables.find(previous => previous.name == variable.id)) {
                                variable.id = current.name
                            }
                        }
                    } else if(typeof map == `object`) {
                        if(typeof map.id == `string` && previousVariables.find(previous => previous.name == map.id)) {
                            map.id = current.name
                        }
                    }
                }
            }
            this.dispatchEvent(new CustomEvent(`change`, { detail }))
        }
        else 
            this.dispatchChangeEvent()
    }
    UnRegisterVariable(reference) {
        const previousReferences = this.#RemoveVariable(reference)
        if(previousReferences.length > 0)
            this.dispatchChangeEvent()
    }
    #RemoveVariable(reference) {
        if(!reference || typeof reference != `object` || !reference.name) return []
        reference = { ...reference }

        let match = getMatcherForReference(reference)

        const dotIndex = reference.name.indexOf(`.`)
        if(dotIndex != -1) {
            const listName = reference.name.substring(0, dotIndex)
            if(this[listName] == undefined)
                return []
            reference.name = reference.name.substring(dotIndex + 1)

            const map = this[listName][reference.name]
            if(Array.isArray(map)){
                let existingIndex = -1
                let removedList = []
                while((existingIndex = map.findIndex(match)) != -1) {
                    const [removed] = this[listName][reference.name].splice(existingIndex, 1)
                    const length = this[listName][reference.name].length
                    if(length == 0)
                        delete this[listName][reference.name]
                    else if(length == 1)
                        this[listName][reference.name] = map[0]
                    removedList.push({ ...removed, name: `${listName}.${removed.name}` })
                }
                if(removedList.length > 0)
                    return removedList
            }
            if(map && match(map)){
                const removed = this[listName][reference.name]
                delete this[listName][reference.name]
                return [ { ...removed, name: `${listName}.${removed.name}` } ]
            }
        } else if(this[reference.name] != undefined) {
            const map = this[reference.name]
            if(Array.isArray(map)){
                let existingIndex = -1
                let removedList = []
                while((existingIndex = map.findIndex(match)) != -1) {
                    const [removed] = this[reference.name].splice(existingIndex, 1)
                    const length = this[reference.name].length
                    if(length == 0)
                        delete this[reference.name]
                    else if(length == 1)
                        this[reference.name] = map[0]
                    removedList.push(removed)
                }
                if(removedList.length > 0)
                    return removedList
            }
            if(map && match(map)){
                const removed = this[reference.name]
                delete this[reference.name]
                return [ removed ]
            }
        }
        return []
    }
    GetSelections(calculations, filter, ungroupSelections = true) {
        var selections = []
        if (calculations?.length > 0) {
            var configGroups = calculations
            if(!calculations[0].group && !calculations[0].calculations)
                configGroups = [{ group: `Calculations`, calculations: calculations }]
    
            for(var c = 0; c < configGroups.length; c++) {
                var configOptions = { group: configGroups[c].group, options: [] }
                calculations = configGroups[c].calculations
                for (var i = 0; i < calculations.length; i++) {
                    if(!filter || filter(calculations[i])) {
                        configOptions.options.push({
                            name: calculations[i].displayName,
                            value: calculations[i].name
                        })
                    }
                }
                if(configOptions.options.length > 0)
                    selections.push(configOptions)
            }
        }

        const getSelectionsForList = function(list, prefix = ``) {
            let listSelections = { group: prefix.slice(0, -1), options: [] }

            for (let variableName in list) {
                for(let variable of Array.isArray(list[variableName])? list[variableName] : [ list[variableName] ]) {
                    if(variable.id == undefined){
                        const subSelections = getSelectionsForList(variable, `${prefix}${variableName}.`)
                        if(subSelections.options.length > 0) {
                            //fix because UISelection does not support nested groups, so we flatten the group hierarchy into the option names
                            if(listSelections.group.length > 0)
                                listSelections.options.push(...subSelections.options.map(option => ({ ...option, name: `${subSelections.group.substring(subSelections.group.indexOf('.') + 1)}.${option.name}` })))
                            else
                                listSelections.options.push(subSelections)
                        }
                        continue
                    }
                    if((!filter || filter(variable)) && variable.id != undefined) {
                        listSelections.options.push({
                            name: variableName,
                            info: variable.unit? `[${GetMeasurementNameFromUnitName(variable.unit)}]` : ``,
                            value: { 
                                name: `${prefix}${variableName}`,
                                ...( variable.type == undefined? undefined :{ type: variable.type } ),
                                ...( variable.unit == undefined? undefined :{ unit: variable.unit } )
                            }
                        })
                    }
                }
            }

            return listSelections
        }

        selections.push(...getSelectionsForList(this).options)
    
        if(selections.length == 1 && ungroupSelections)
            return selections[0].options
    
        return selections
    }
}

export function defaultNoVariables(outputUnits, outputTypes, inputTypes, inputUnits) {
    const def = defaultFilter(outputUnits, outputTypes, inputTypes, inputUnits)
    return function(calcOrVar) {
        if(calcOrVar.type || calcOrVar.unit) 
            return false
        return def(calcOrVar)
    }
}

export function defaultFilter(outputUnits, outputTypes, inputTypes, inputUnits) {
    return function(calcOrVar) {
        //variable filter
        if(calcOrVar.type || calcOrVar.unit) {
            if(inputTypes?.length || inputUnits?.length) return false
            if(outputUnits?.[0] != undefined) {
                if(outputUnits.length != 1) return false
                // Each enum is its own measurement group so a simple group equality check is enough
                if(GetMeasurementNameFromUnitName(calcOrVar.unit) != GetMeasurementNameFromUnitName(outputUnits[0])) return false
            } else if(outputTypes?.[0] != undefined){
                if(outputTypes.length != 1) return false
                if(calcOrVar.unit == undefined && calcOrVar.type == undefined ) return false
                // Enum variables have a unit (the enum name) but are NOT floats — check by type.
                if(calcOrVar.type == `enum` && outputTypes[0].split(`|`).indexOf(`enum`) == -1) return false
                if(calcOrVar.type != `enum` && calcOrVar.unit != undefined && outputTypes[0].split(`|`).indexOf(`float`) == -1) return false
                if(calcOrVar.type != undefined && calcOrVar.type != `enum` && !outputTypes[0].split(`|`).some(t => calcOrVar.type.split(`|`).indexOf(t) != -1)) return false
            }
            return true
        }

        //calculation Filter
        if(outputUnits != undefined || outputTypes != undefined) {
            if((outputUnits?.length ?? outputTypes?.length ?? 0) == 0 && (calcOrVar.outputUnits?.length ?? calcOrVar.outputTypes?.length) != 0)
                return false
            for(let i = 0; i < (outputUnits?.length ?? outputTypes?.length ?? 0); i++){
                if(outputUnits?.[i] != undefined && outputUnits[i] != ``) {
                    if((calcOrVar.outputTypes?.[i]?.split(`|`).indexOf(`float`) ?? -1) == -1 && outputUnits[i] != calcOrVar.outputUnits?.[i]) return false
                } else if(outputTypes?.[i] != undefined){
                    if(calcOrVar.outputUnits?.[i] == undefined && calcOrVar.outputTypes?.[i] == undefined) return false
                    if(calcOrVar.outputUnits?.[i] != undefined && outputTypes[i].split(`|`).indexOf(`float`) == -1) return false
                    if(calcOrVar.outputTypes?.[i] != undefined && !outputTypes[i].split(`|`).some(t => calcOrVar.outputTypes[i].split(`|`).indexOf(t) != -1)) return false
                }
            }
        }
        
        if(inputUnits != undefined || inputTypes != undefined) {
            if((inputUnits?.length ?? inputTypes?.length ?? 0) == 0 && (calcOrVar.inputUnits?.length ?? calcOrVar.inputTypes?.length ?? 0) != 0)
                return false
            for(let i = 0; i < (inputUnits?.length ?? inputTypes?.length ?? 0); i++){
                if(inputUnits?.[i] != undefined) {
                    if((calcOrVar.inputTypes?.[i]?.split(`|`).indexOf(`float`) ?? -1) == -1 && inputUnits[i] != calcOrVar.inputUnits?.[i]) return false
                } else if(inputTypes?.[i] != undefined){
                    if(calcOrVar.inputUnits?.[i] == undefined && calcOrVar.inputTypes?.[i] == undefined) return false
                    if(calcOrVar.inputUnits?.[i] != undefined && inputTypes[i].split(`|`).indexOf(`float`) == -1) return false
                    if(calcOrVar.inputTypes?.[i] != undefined && !inputTypes[i].split(`|`).some(t => calcOrVar.inputTypes[i].split(`|`).indexOf(t) != -1)) return false
                }
            }
        }
        return true
    }
}

export function getMatcherForReference(reference) {
    let match = a => true
    if(reference.unit != undefined)
        match = a => (a.unit == undefined && typeof a.id == `string`) || a.unit == reference.unit
    else if(reference.measurement != undefined)
        match = a => a.unit == undefined || (a.measurement == undefined && typeof a.id == `string`) || reference.measurement == GetMeasurementNameFromUnitName(a.unit)
    else if(reference.type != undefined)
        match = a => (a.type == undefined && typeof a.id == `string`) || a.type?.split(`|`).some(t => reference.type.indexOf(t) != -1)
    return match
}