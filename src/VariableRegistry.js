import { objectTester } from "./JavascriptUI/UIUtils.js"
export default class VariableRegistry extends EventTarget {
    constructor(prop) {
        super()
        Object.assign(this, prop)
        this.CreateIfNotFound = false
    }
    #dispatchWaiting = false
    #dispatchDetails = []
    #dispatchEvent = (detail) => {
        this.#dispatchDetails.push(detail)
        if(!this.#dispatchWaiting) {
            this.#dispatchWaiting = true
            setTimeout(() => {
                this.#dispatchWaiting = false
                const details = this.#dispatchDetails
                this.#dispatchDetails = []
                this.dispatchEvent(new CustomEvent(`change`, { detail: details }))
            }, 50)
        }
    }
    #dispatchReplaceEvent = () => { this.#cachedSelectionsValid = false; this.#dispatchEvent({ action: `replace` }) }
    #dispatchClearEvent = () => { this.#cachedSelectionsValid = false; this.#dispatchEvent({ action: `clear` }) }
    #dispatchChangeEvent = () => { this.#cachedSelectionsValid = false; this.#dispatchEvent({ action: `change` }) }
    #dispatchUpdateEvent = (detail) => { this.#cachedSelectionsValid = false; this.#dispatchEvent(detail) }
    get variableReferences() {
        var variableReferences = { ...this }
        delete variableReferences.CreateIfNotFound
        return variableReferences
    }
    set variableReferences(variableReferences) {
        Object.assign(this, variableReferences)
        this.#dispatchReplaceEvent()
    }
    Clear() {
        Object.entries(this).forEach(([elementname, element]) => {
            if(elementname == `CreateIfNotFound`)
                return
            delete this[elementname]
        })
        this.#dispatchClearEvent()
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

        const match = getMatcherForReference(reference)
        
        let dotIndex
        let list = this
        let referenceName = reference.name
        while((dotIndex = referenceName.indexOf(`.`)) != -1) {
            const listName = referenceName.substring(0, dotIndex)
            if(list[listName] == undefined) {
                list = undefined
                break;
            }
            list = list[listName]
            referenceName = referenceName.substring(dotIndex + 1)
        }

        let variable
        if (list != undefined && typeof list[referenceName] == `object`) {
            const map = list[referenceName]

            const matched = Array.isArray(map) ? map.find(match) : (map && match(map) ? map : undefined)
            if(matched)
                variable = { ...matched, name: reference.name }
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
        if(variable.id == undefined) {
            variable.id = this.GenerateVariableId()
            const match = getMatcherForReference(reference)

            let dotIndex
            let list = this
            let referenceName = reference.name
            while((dotIndex = referenceName.indexOf(`.`)) != -1) {
                const listName = referenceName.substring(0, dotIndex)
                list[listName] ??= {}
                list = list[listName]
                referenceName = referenceName.substring(dotIndex + 1)
            }

            if (typeof list[referenceName] == `object`) {
                let map = list[referenceName]

                if(Array.isArray(map)) {
                    map = map.find(match)
                }
                if(map && match(map)) {
                    map.id = variable.id
                }
            }
        }
        if(variable) return variable.id
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
        this.#RemoveVariable(reference)

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
            const updateAliases = value => {
                if(!value || typeof value !== `object`)
                    return
                if(typeof value.id === `string` && previousVariables.some(previous => previous.name === value.id))
                    value.id = current.name
                else
                    Object.values(value).forEach(updateAliases)
            }
            Object.values(this).forEach(updateAliases)
            this.#dispatchUpdateEvent(detail)
        }
        else 
            this.#dispatchChangeEvent()
    }
    UnRegisterVariable(reference) {
        const previousReferences = this.#RemoveVariable(reference)
        if(previousReferences.length > 0)
            this.#dispatchChangeEvent()
    }
    #RemoveVariable(reference) {
        if(!reference || typeof reference != `object` || !reference.name) return []
        reference = { ...reference }

        const match = getMatcherForReference(reference)
        
        let dotIndex
        let list = this
        let referenceName = reference.name
        while((dotIndex = referenceName.indexOf(`.`)) != -1) {
            const listName = referenceName.substring(0, dotIndex)
            if(list[listName] == undefined) return []
            list = list[listName]
            referenceName = referenceName.substring(dotIndex + 1)
        }

        let removed = []
        if (typeof list[referenceName] == `object`) {
            const map = list[referenceName]

            if(Array.isArray(map)) {
                removed = map.filter(match)
                list[referenceName] = map.filter(variable => !match(variable))
                if(list[referenceName].length == 0)
                    delete list[referenceName]
            } else if(map && match(map)) {
                removed = [map]
                delete list[referenceName]
            }

        }

        return removed.map(variable => ({ ...variable, name: reference.name }))
    }
    #cachedSelectionsValid = false
    #cachedSelections = []
    #UpdateCachedSelections() {
        if(this.#cachedSelectionsValid)
            return

        const getSelectionsForList = function(list, prefix = ``) {
            let listSelections = { group: prefix.slice(0, -1), options: [] }

            for (let variableName in list) {
                for(let variable of Array.isArray(list[variableName])? list[variableName] : [ list[variableName] ]) {
                    if(typeof variable != `object`)
                        continue
                    const keys = Object.keys(variable)
                    const variableKeys = [`unit`, `measurement`, `type`, `id`]
                    if(keys.some(key => variableKeys.indexOf(key) == -1)) {
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
                    if(keys.some(key => variableKeys.indexOf(key) != -1)) {
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

        this.#cachedSelections = getSelectionsForList(this).options
        this.#cachedSelectionsValid = true
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

        this.#UpdateCachedSelections()
        let variableSelections = this.#cachedSelections
        if(filter) {
            variableSelections = variableSelections.map(x => x.group? { ...x, options: x.options.filter(y => filter(y.value)) } : x).filter(x => (x.group && x.options.length > 0) || (!x.group && filter(x.value)))
        }
        selections.push(...variableSelections)
    
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
