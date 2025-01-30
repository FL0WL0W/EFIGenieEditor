export default class VariableRegistry {
    constructor(prop) {
        Object.assign(this, prop)
        this.CreateIfNotFound = false
    }
    Clear() {
        Object.entries(this).forEach(([elementname, element]) => {
            if(elementname === `CreateIfNotFound`)
                return
            delete this[elementname]
        })
    }
    GenerateVariableId() {
        this.VariableIncrement ??= 0
        return ++this.VariableIncrement
    }
    GetVariableByReference(reference) {
        if(!reference || typeof reference !== `object`) return

        let variable
        //variable is contained in a list
        const dotIndex = reference.name?.indexOf(`.`)
        if((dotIndex ?? -1) !== -1) {
            const listName = reference.name.substring(0, dotIndex)
            if(!this[listName]) return
            variable = { name: reference.name.substring(dotIndex + 1) }

            variable = this[listName].find(a => 
                a.name === variable.name && 
                (reference.unit == undefined || a.unit === reference.unit || (a.unit == undefined && typeof a.id === `string`)) && 
                (reference.type == undefined || (a.unit != undefined && reference.type.split(`|`).indexOf(`float`) !== -1) || a.type?.split(`|`).some(t => reference.type.split(`|`).indexOf(t) !== -1) || (a.type == undefined && typeof a.id === `string`)))
        //variable is an object in this
        } else if (typeof this[reference.name] === `object`) {
            variable = this[reference.name]
        //variable points indirectly to another variable by name or is directly the id
        } else if (typeof this[reference.name] === `string`, typeof this[reference.name] === `number`) {
            variable = { name: reference.name, id: this[reference.name] }
        }

        if(variable) {
            if(typeof variable.id === `string`) {
                const referencedVariable = this.GetVariableByReference({ name: variable.id, unit: reference.unit ?? variable.unit, type: reference.type ?? variable.type })
                if(referencedVariable)
                    return { ...referencedVariable, name: variable.name }
            }
            return variable
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
        if(dotIndex !== -1) {
            const listName = variable.name.substring(0, dotIndex)
            this[listName] ??= []
            variable.name = variable.name.substring(dotIndex + 1)

            this[listName].push(variable)
        } else {
            this[variable.name] = variable
        }

        return this.GetVariableId(reference)
    }
    RegisterVariable(reference) {
        if(!reference || typeof reference !== `object` || !reference.name) return
        reference = { ...reference }

        const dotIndex = reference.name.indexOf(`.`)
        if(dotIndex !== -1) {
            const listName = reference.name.substring(0, dotIndex)
            this[listName] ??= []
            reference.name = reference.name.substring(dotIndex + 1)

            const existingIndex = this[listName].findIndex(a => 
                a.name === reference.name && 
                (reference.unit == undefined || a.unit === reference.unit || (a.unit == undefined && typeof a.id === `string`)) && 
                (reference.type == undefined || (a.unit != undefined && reference.type.split(`|`).indexOf(`float`) !== -1) || (a.type == undefined && typeof a.id === `string`) || a.type?.split(`|`).some(t => reference.type.split(`|`).indexOf(t) !== -1)))
            if(existingIndex !== -1) {
                reference.generatedID ??= this[listName][existingIndex].generatedID
                reference.id ??= this[listName][existingIndex].id
                this[listName].splice(existingIndex, 1)
            }
            reference.id ??= reference.generatedID ??= this.GenerateVariableId()
            this[listName].push(reference)
        } else {
            reference.id ??= this.GenerateVariableId()
            this[reference.name] = reference
        }
    }
    UnRegisterVariable(reference) {
        if(!reference || typeof reference !== `object` || !reference.name) return
        reference = { ...reference }

        const dotIndex = reference.name.indexOf(`.`)
        if(dotIndex !== -1) {
            const listName = reference.name.substring(0, dotIndex)
            if(this[listName] === undefined)
                return
            reference.name = reference.name.substring(dotIndex + 1)

            const existingIndex = this[listName].findIndex(a => 
                a.name === reference.name && 
                (reference.unit == undefined || a.unit === reference.unit || (a.unit == undefined && typeof a.id === `string`)) && 
                (reference.type == undefined || (a.unit != undefined && reference.type.split(`|`).indexOf(`float`) !== -1) || (a.type == undefined && typeof a.id === `string`) || a.type?.split(`|`).some(t => reference.type.split(`|`).indexOf(t) !== -1)))
            if(existingIndex !== -1) {
                this[listName].splice(existingIndex, 1)
            }
        } else {
            delete this[reference.name]
        }
    }
    GetVariableReferenceList() {
        var variableReferences = {}
        for (var property in this) {
            if (this[property] == undefined)
                continue
    
            if(property === `VariableIncrement` || property === `CreateIfNotFound`)
                continue
            if(property.toLowerCase().indexOf(`temp`) === 0)
                continue
    
            if (Array.isArray(this[property])) {
                variableReferences[property] ??= []
                var arr = this[property]
    
                for (var i = 0; i < this[property].length; i++) {
                    let reference = { ...this[property][i] }
                    reference.name = `${property}.${reference.name}`
                    variableReferences[property].push(this.GetVariableByReference(reference))
                }
            } else {
                variableReferences[property] = this.GetVariableByReference(this[property])
            }
        }
        return variableReferences
    }
    GetSelections(calculations, filter) {
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
    
        for (var property in this) {
            if (!Array.isArray(this[property]))
                continue
    
            var arr = this[property]
    
            var arrSelections = { group: property, options: [] }
    
            for (var i = 0; i < arr.length; i++) {
                if (!filter || filter(arr[i])) {
                    arrSelections.options.push({
                        name: arr[i].name,
                        info: arr[i].unit? `[${GetMeasurementNameFromUnitName(arr[i].unit)}]` : ``,
                        value: { 
                            name: `${property}.${arr[i].name}`,
                            ...( arr[i].type == undefined? undefined :{ type: arr[i].type } ),
                            ...( arr[i].unit == undefined? undefined :{ unit: arr[i].unit } )
                        }
                    })
                }
            }
            if(arrSelections.options.length > 0)
                selections.push(arrSelections)
        }
    
        if(selections.length === 1)
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
                if(outputUnits.length !== 1) return false
                if(GetMeasurementNameFromUnitName(calcOrVar.unit) !== GetMeasurementNameFromUnitName(outputUnits[0])) return false
            } else if(outputTypes?.[0] != undefined){
                if(outputTypes.length !== 1) return false
                if(calcOrVar.unit == undefined && calcOrVar.type == undefined ) return false
                if(calcOrVar.unit != undefined && outputTypes[0].split(`|`).indexOf(`float`) === -1) return false
                if(calcOrVar.type != undefined && !outputTypes[0].split(`|`).some(t => calcOrVar.type.split(`|`).indexOf(t) !== -1)) return false
            }
            return true
        }

        //calculation Filter
        if(outputUnits != undefined || outputTypes != undefined) {
            if((outputUnits?.length ?? outputTypes?.length ?? 0) === 0 && (calcOrVar.outputUnits?.length ?? calcOrVar.outputTypes?.length) !== 0)
                return false
            for(let i = 0; i < (outputUnits?.length ?? outputTypes?.length ?? 0); i++){
                if(outputUnits?.[i] != undefined && outputUnits[i] !== ``) {
                    if((calcOrVar.outputTypes?.[i]?.split(`|`).indexOf(`float`) ?? -1) === -1 && outputUnits[i] !== calcOrVar.outputUnits?.[i]) return false
                } else if(outputTypes?.[i] != undefined){
                    if(calcOrVar.outputUnits?.[i] == undefined && calcOrVar.outputTypes?.[i] == undefined) false
                    if(calcOrVar.outputUnits?.[i] != undefined && outputTypes[i].split(`|`).indexOf(`float`) === -1) return false
                    if(calcOrVar.outputTypes?.[i] != undefined && !outputTypes[i].split(`|`).some(t => calcOrVar.outputTypes[i].split(`|`).indexOf(t) !== -1)) return false
                }
            }
        }
        
        if(inputUnits != undefined || inputTypes != undefined) {
            if((inputUnits?.length ?? inputTypes?.length ?? 0) === 0 && (calcOrVar.inputUnits?.length ?? calcOrVar.inputTypes?.length ?? 0) !== 0)
                return false
            for(let i = 0; i < (inputUnits?.length ?? inputTypes?.length ?? 0); i++){
                if(inputUnits?.[i] != undefined) {
                    if((calcOrVar.inputTypes?.[i]?.split(`|`).indexOf(`float`) ?? -1) === -1 && inputUnits[i] !== calcOrVar.inputUnits?.[i]) return false
                } else if(inputTypes?.[i] != undefined){
                    if(calcOrVar.inputUnits?.[i] == undefined && calcOrVar.inputTypes?.[i] == undefined) false
                    if(calcOrVar.inputUnits?.[i] != undefined && inputTypes[i].split(`|`).indexOf(`float`) === -1) return false
                    if(calcOrVar.inputTypes?.[i] != undefined && !inputTypes[i].split(`|`).some(t => calcOrVar.inputTypes[i].split(`|`).indexOf(t) !== -1)) return false
                }
            }
        }
        return true
    }
}