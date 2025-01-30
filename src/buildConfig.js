import pako from "pako"
import VariableRegistry from "./VariableRegistry"
import { GetUnitFromName } from "./UI/UIUnit"

export default function buildConfig(obj) {
    return types.find(x => x.type === obj.type).toArrayBuffer.call(obj)
}

var BuildRegister

let OperationArchitectureFactoryIDs = {
    Offset: 10000,
    Package: 0,
    Group: 1,
    Table: 2,
    LookupTable: 3,
    Polynomial: 4,
    Static: 5,
    FaultDetection: 6,
    Add: 10,
    Subtract: 11,
    Multiply: 12,
    Divide: 13,
    And: 14,
    Or: 15,
    GreaterThan: 16,
    LessThan: 17,
    Equal: 18,
    GreaterThanOrEqual: 19,
    LessThanOrEqual: 20,
    Not: 21,
    UnitConversion: 22
}
let EmbeddedOperationsFactoryIDs = {
    Offset: 20000,
    AnalogInput: 1,
    DigitalInput: 2,
    DigitalPinRecord: 3,
    DutyCyclePinRead: 4,
    FrequencyPinRead: 5,
    PulseWidthPinRead: 6,
    DigitalOutput: 7,
    PulseWidthPinWrite: 8,
    GetTick: 9,
    SecondsToTick: 10,
    TickToSeconds: 11,
    Record: 12,
    FIRFilter: 13,
    Interval: 14,
    CANReadData: 15,
    CANWriteData: 16,
    CANParseData: 17,
    CANPackData: 18
}
let ReluctorFactoryIDs = {
    Offset: 30000,
    GM24X: 1,
    Universal1X: 2,
    UniversalMissintTooth: 3
}
let EngineFactoryIDs = {
    Offset : 40000,
    CylinderAirMass_SD: 1,
    InjectorPrime: 2,
    PositionCrankPriority: 3,
    PositionCamPriority: 4,
    EngineParameters: 5,
    ScheduleIgnition: 6,
    ScheduleInjection: 7,
    InjectorDeadTime: 8
}

Uint8Array.prototype.toHex = function() { // buffer is an ArrayBuffer
    var hexArray = Array.prototype.map.call(new Uint8Array(this), x => (`00` + x.toString(16)).slice(-2))
    var string = `${hexArray[0]}`
    for(var i = 1; i<hexArray.length; i++){
        if(i%16===0)
            string += `\n`
        else if(i%8===0)
            string += `  `
        else
            string += ` `
        string += hexArray[i]
    }
    return string
}

let crc32table = []
for (let i = 0; i < 256; ++i) {
    let b = i
    for (let i = 0; i < 8; ++i) {
        b = b & 1 ? 0xEDB88320 ^ (b >>> 1) : b >>> 1
    }
    crc32table[i] = b
}

ArrayBuffer.prototype.crc32 = function() {

    var crc = -1

    let uint8Array = new Uint8Array(this)
    for (let i = 0; i < uint8Array.length; ++i) {
        crc = crc32table[(crc ^ uint8Array[i]) & 0xFF] ^ (crc >>> 8)
    }

    crc ^= -1
    return crc
}

ArrayBuffer.prototype.concatArray = function(b) { // a, b TypedArray of same type
    var tmp = new Uint8Array(this.byteLength + b.byteLength)
    if(this.byteLength > 0)
        tmp.set(new Uint8Array(this), 0)
    tmp.set(new Uint8Array(b), this.byteLength)
    return tmp.buffer
}

ArrayBuffer.prototype.pad = function(bytes, padByte) {
    if(padByte == undefined){
        padByte = 0xFF
    }
    var array = []
    for(var i = 0; i < bytes; i++){
        array[i] = padByte
    }
    return this.concatArray(new Uint8Array(array).buffer)
}

ArrayBuffer.prototype.align = function(align, padByte) {
    if(this.byteLength % align > 0){
        return this.pad(align - (this.byteLength % align), padByte)
    }
    return this
}

function isEmptyObject(obj) {
    for(var prop in obj) {
        if(obj[prop] == undefined)
            continue
        if(Object.prototype.hasOwnProperty.call(obj, prop)) {
            return false
        }
    }
  
    return true
}

function GetArrayType(tableValue) {
    var min = 9000000000000000
    var max = -9000000000000000
    for (var i = 0; i < tableValue.length; i++) {
        if (tableValue[i] % 1 != 0) {
            return `FLOAT`
        }
        if (tableValue[i] < min) {
            min = tableValue[i]
        }
        if (tableValue[i] > max) {
            max = tableValue[i]
        }
    }
    if (typeof tableValue[0] === `boolean`) {
        return `BOOL`
    }
    if (min < 0) {
        if (max < 0 || min < -max)
            return GetType(min)
        return GetType(-max)
    }
    return GetType(max)
}

function GetType(value) {
    if(value == undefined)
        return `VOID`
    if(Array.isArray(value)) 
        return GetArrayType(value)
    if(typeof value === `boolean`)
        return `BOOL`
    if(value % 1 !== 0)
        return `FLOAT`

    if(value < 0) {
        if(value < 128 && value > -129)
            return `INT8`
        if(value < 32768 && value > -32759)
            return `INT16`
        if(value < 2147483648 && value > -2147483649)
            return `INT32`
        if(value < 9223372036854775807 && value > -9223372036854775808)
            return `INT64`

        throw `number too big`
    }

    if(value < 128)
        return `INT8`
    if(value < 256)
        return `UINT8`
    if(value < 32768)
        return `INT16`
    if(value < 65536)
        return `UINT16`
    if(value < 2147483648)
        return `INT32`
    if(value < 4294967295)
        return `UINT32`
    if(value < 9223372036854775807)
        return `INT64`
    if(value < 18446744073709551615)
        return `UINT64`
    throw `number too big`
}

function GetTypeId(type) {
    switch(type) {
        case `VOID`: return 0
        case `UINT8`: return 1
        case `UINT16`: return 2
        case `UINT32`: return 3
        case `UINT64`: return 4
        case `INT8`: return 5
        case `INT16`: return 6
        case `INT32`: return 7
        case `INT64`: return 8
        case `FLOAT`: return 9
        case `DOUBLE`: return 10
        case `BOOL`: return 11
    }
}

let PackedTypeAlignment = [
    { type: `INT8`, align: 1 }, 
    { type: `INT16`, align: 1 },
    { type: `INT32`, align: 1 },
    { type: `INT64`, align: 1 },
    { type: `BOOL`, align: 1 }, 
    { type: `UINT8`, align: 1 },
    { type: `UINT16`, align: 1 },
    { type: `UINT32`, align: 1 },
    { type: `UINT64`, align: 1 },
    { type: `FLOAT`, align: 1 },
    { type: `DOUBLE`, align: 1 },
]

let STM32TypeAlignment = [
    { type: `INT8`, align: 1 }, 
    { type: `INT16`, align: 2 },
    { type: `INT32`, align: 4 },
    { type: `INT64`, align: 8 },
    { type: `BOOL`, align: 1 }, 
    { type: `UINT8`, align: 1 },
    { type: `UINT16`, align: 2 },
    { type: `UINT32`, align: 4 },
    { type: `UINT64`, align: 8 },
    { type: `FLOAT`, align: 4 },
    { type: `DOUBLE`, align: 8 },
]

let x86TypeAlignment = [
    { type: `INT8`, align: 1 }, 
    { type: `INT16`, align: 2 },
    { type: `INT32`, align: 4 },
    { type: `INT64`, align: 8 },
    { type: `BOOL`, align: 1 }, 
    { type: `UINT8`, align: 1 },
    { type: `UINT16`, align: 2 },
    { type: `UINT32`, align: 4 },
    { type: `UINT64`, align: 8 },
    { type: `FLOAT`, align: 4 },
    { type: `DOUBLE`, align: 8 },
]

function Packagize(definition, val) {
    val = {...val}
    val.outputVariables ??= []
    val.outputUnits = (val.unit == undefined? val.outputUnits : [val.unit]) ?? []
    delete val.unit
    val.outputVariables = val.outputVariables?.map((ov, idx) => {
        if(typeof ov !== `string`)
            return ov

        let unit = ov.substring(ov.indexOf(`(`) > -1? ov.indexOf(`(`)+1 : ov.length)
        if(unit.indexOf(`)`) > 0)
        {
            unit = unit.substring(0, unit.indexOf(`)`))
            val.outputUnits[idx] ??= unit
        }

        let variableReference = ov.substring(0, ov.indexOf(`(`) > -1? ov.indexOf(`(`) : ov.length)
        return variableReference
    })
    val.inputVariables ??= []
    if( (val.outputVariables && val.outputVariables.some(x => x != undefined)) || 
        (val.inputVariables && val.inputVariables.some(x => x != undefined))) {
        definition.type = `Package`
        val.outputVariables.forEach(x => { BuildRegister.RegisterVariable(x) })
        definition.outputVariables = val.outputVariables
        definition.outputUnits = val.outputUnits
        definition.inputVariables = val.inputVariables
        return { type: `definition`, value: [ definition ] }
    }
    return definition
}

function Calculation_Math(mathFactoryId, inputs = 2) {
    if(this.outputVariables || this.inputVariables){
        this.inputVariables ??= inputs === 2? [0,0] : [0]
        this.outputVariables ??= [0]
    }

    return Packagize({ type: `definition`, value: [ { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + mathFactoryId } ]}, this)
}

function ReluctorTemplate(definition) {
    const recordVariable = { name: this.outputVariables?.[0]?.name, type: `Record` }
    return { type: `Group`, value: [
        { ...this, type: `Input_DigitalRecord`, outputVariables: [ recordVariable ] },
        Packagize( definition, { 
            ...this,
            inputVariables: [ 
                recordVariable,
                { name: `CurrentTick`, type: `tick` }
            ]
        })
    ]}
}

function mapDefinitionFromValue(value) {
    const typeInfo = this.types?.find(t => t.type == value.type)
    value = { ...value, ...typeInfo }
    if(value.definition) return value.definition
    value.types ??= []
    for(let typeIndex in this.types){
        if(value.types.find(x => x.type === this.types[typeIndex].type) == undefined){
            value.types.push(this.types[typeIndex])
        }
    }    

    if(value.toDefinition) {
        let definition = value.toDefinition.call(value)
        if(definition == undefined)
            return
        if(definition.type !== `definition`)
            definition = { type: `definition`, value: [definition]}
        return definition.value.flatMap(v => mapDefinitionFromValue.call(value, v))
    }
    return value
}
function toDefinition() {
    let definitions = this.value.flatMap(v => mapDefinitionFromValue.call(this, v))
    return { type: `definition`, value: definitions, types: this.types }
}
function toArrayBuffer() {
    let definition = toDefinition.call(this)
    var buffer = new ArrayBuffer()
    for(var index in definition.value){
        if(definition.value[index] == undefined)
            continue
        var typeInfo = definition.types.find(x => x.type === definition.value[index].type)

        //align
        var align = definition.value[index].align
        if(align == undefined && typeInfo != undefined){
            align = typeInfo.align
        }
        if(align) {
            buffer = buffer.align(align)
        }

        var toArrayBuffer = definition.value[index].toArrayBuffer
        if(toArrayBuffer == undefined && typeInfo != undefined && definition.value[index].type !== `definition`){
            toArrayBuffer = typeInfo.toArrayBuffer
        }
        if(toArrayBuffer != undefined){
            buffer = buffer.concatArray(toArrayBuffer.call(definition.value[index]))
        }
    }
    return buffer
}

let types = [
    { type: `definition`, toDefinition, toArrayBuffer},
    { type: `INT8`, toArrayBuffer() { return new Int8Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `INT16`, toArrayBuffer() { return new Int16Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `INT32`, toArrayBuffer() { return new Int32Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `INT64`, toArrayBuffer() { return new BigInt64Array(Array.isArray(this.value)? this.value : [BigInt(this.value)]).buffer }},
    { type: `BOOL`, toArrayBuffer() { return new Uint8Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `UINT8`, toArrayBuffer() { return new Uint8Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `UINT16`, toArrayBuffer() { return new Uint16Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `UINT32`, toArrayBuffer() { return new Uint32Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `UINT64`, toArrayBuffer() { return new BigUint64Array(Array.isArray(this.value)? this.value : [BigInt(this.value)]).buffer }},
    { type: `FLOAT`, toArrayBuffer() { return new Float32Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `DOUBLE`, toArrayBuffer() { return new Float64Array(Array.isArray(this.value)? this.value : [this.value]).buffer }},
    { type: `CompressedObject`, toArrayBuffer() { return pako.gzip(new TextEncoder().encode(JSON.stringify(this.value))).buffer }},
    { type: `VariableId`, toDefinition() { 
        return { type: `definition`, value: [
            { type: `UINT32`, value: typeof this.value === `number`? this.value : BuildRegister.GetVariableId(this.value) }
        ]} 
    }},
    { type: `Package`, toDefinition() {
        this.value.unshift({ type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Package }) //Package
        
        const thisValue = this
        for(let index in this.outputVariables) {
            thisValue.value.push({ type: `VariableId`, value: this.outputVariables?.[index] })
        }

        delete this.outputUnits
        delete this.outputVariables

        this.inputVariables?.forEach(inputVariable => {
            thisValue.value.push({ type: `VariableId`, value: inputVariable ?? 0 })
        })

        delete this.inputVariables

        this.type = `definition`

        return this
    }},
    { type: `Group`, toDefinition() {
        let newValue = []
        const thisGroup = this

        const removedTypes = [...this.types.filter(t => t.type === `Group` || t.type === `Package`)]
        this.types = this.types.filter(t => !(t.type === `Group` || t.type === `Package`))
        function reduce(value) {
            if(isEmptyObject(value))
                return
                
            let definition = mapDefinitionFromValue.call(thisGroup, value)
            if(!Array.isArray(definition))
                definition = [definition]
            for(index in definition)
            {
                if(definition[index] == undefined)
                    continue
                //consolidate group
                if(definition[index].type === `Group`) {
                    for(var typeIndex in definition[index].types){
                        var typetypeInfo = thisGroup.types.find(x => x.type === definition[index].types[typeIndex].type)
                        if(typetypeInfo == undefined){
                            thisGroup.types.push(definition[index].types[typeIndex])
                        }
                    }
                    definition[index].value.forEach(reduce)
                //if type is package add to newValue
                } else if(definition[index].type === `Package`) {
                    newValue.push(definition[index])
                //if type is not package than create a definition for it
                } else {
                    if(newValue[newValue.length - 1]?.type !== `definition`) {
                        newValue.push({ type: `definition`, value: [definition[index]] })
                    } else {
                        newValue.push(definition[index])
                    }
                }
            }
        }
        this.value.forEach(reduce)
        this.types = [...this.types, ...removedTypes]

        newValue.unshift({ type: `UINT16`, value: newValue.length })
        newValue.unshift({ type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Group }) //Group
        this.value = newValue
        this.type = `definition`

        return Packagize(this, this)
    }},
    { type: `Calculation_Static`, toDefinition() {
        var type = GetType(this.value)
        var typeID = GetTypeId(type)
        return Packagize({ type: `definition`, value: [ 
            { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Static},
            { type: `UINT8`, value: typeID }, //typeid
            { type: type, value: this.value } //val
        ]}, this)
    }},
    { type: `Calculation_2AxisTable`, inputs: 2, toDefinition() {
        this.inputVariables ??= [ undefined, undefined ]
        if(this.XSelection)
            this.inputVariables[0] = this.XSelection
        if(this.YSelection)
            this.inputVariables[1] = this.YSelection

        const type = GetArrayType(this.table.value)
        const typeId = GetTypeId(type)
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Table }, //factory ID
            { type: `UINT8`, value: this.table.xAxis.length }, //xResolution
            { type: `UINT8`, value: this.table.yAxis.length }, //yResolution
            { type: `UINT8`, value: typeId }, //Type
            { type: `FLOAT`, value: this.table.xAxis }, //xAxis
            { type: `FLOAT`, value: this.table.yAxis }, //yAxis
            { type: type, value: this.table.value }, //Table
        ]}, this)
    }},
    { type: `Calculation_LookupTable`, inputs: 1, toDefinition() {
        if(this.parameterSelection)
            this.inputVariables = [this.parameterSelection]

        const type = GetArrayType(this.table.value)
        const typeId = GetTypeId(type)
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.LookupTable }, //factory ID
            { type: `UINT8`, value: this.table.xAxis.length }, //xResolution
            { type: `UINT8`, value: typeId }, //Type
            { type: `FLOAT`, value: this.table.xAxis }, //xAxis
            { type: type, value: this.table.value }, //Table
        ]}, this)
    }},
    { type: `Calculation_Polynomial`, inputs: 1, toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Polynomial}, //factory ID
            { type: `FLOAT`, value: this.minValue}, //MinValue
            { type: `FLOAT`, value: this.maxValue}, //MaxValue
            { type: `UINT8`, value: this.coeffecients.length}, //Degree
            { type: `FLOAT`, value: this.coeffecients}, //coefficients
        ]}, this)
    }},
    { type: `Calculation_UnitConversion`, inputs: 1, toDefinition() {
        const fromUnit = GetUnitFromName(this.inputVariables?.[0]?.unit)
        const toUnit = GetUnitFromName(this.outputVariables?.[0]?.unit)
        const multiplier = toUnit.SIMultiplier / fromUnit.SIMultiplier
        const adder = -fromUnit.SIOffset * multiplier + toUnit.SIOffset
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.UnitConversion}, //factory ID
            { type: `FLOAT`, value: multiplier}, //Multiplier
            { type: `FLOAT`, value: adder}, //Adder
        ]}, this)
    }},
    { type: `CalculationOrVariableSelection`, toDefinition() {
        if(this.calculation !== undefined) return { ...this, ...( typeof this.calculation === `object`? this.calculation : { value: this.calculation }), type: this.selection }
        if(!this.selection) return
        const outputUnit = this.outputVariables?.[0]?.unit ?? this.outputUnits?.[0]
        BuildRegister.RegisterVariable({ 
            ...this.selection, 
            ...this.outputVariables?.[0], 
            ...(this.selection?.name != undefined && { id: this.selection.name }),
            ...(outputUnit != undefined && { unit: outputUnit })
        })
        if(outputUnit != undefined && this.selection.unit != outputUnit && !BuildRegister.GetVariableByReference({ ...this.selection, unit: outputUnit })) {
            return { outputVariables: [ { ...this.selection, unit: outputUnit } ], inputVariables: [ this.selection ], type: `Calculation_UnitConversion` }
        }
    }},
    { type: `GenericCalculation`, toDefinition() {
        const name = `${this.outputVariables?.[0]?.name?? ``}${this.name}`
        return { ...this, type: `CalculationOrVariableSelection`, name, outputVariables: (this.outputUnits?.[0] !== undefined || this.outputTypes?.[0] !== undefined) ? [ { name, unit: this.outputUnits?.[0], type: this.outputTypes?.[0] } ] : undefined }
    }},
    { type: `Calculation_Add`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.Add) }},
    { type: `Calculation_Subtract`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.Subtract) }},
    { type: `Calculation_Multiply`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.Multiply) }},
    { type: `Calculation_Divide`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.Divide) }},
    { type: `Calculation_And`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.And) }},
    { type: `Calculation_Or`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.Or) }},
    { type: `Calculation_GreaterThan`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.GreaterThan) }},
    { type: `Calculation_LessThan`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.LessThan) }},
    { type: `Calculation_Equal`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.Equal) }},
    { type: `Calculation_GreaterThanOrEqual`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.GreaterThanOrEqual) }},
    { type: `Calculation_LessThanOrEqual`, inputs: 2, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.LessThanOrEqual) }},
    { type: `Calculation_Not`, inputs: 1, toDefinition() { return Calculation_Math.call(this, OperationArchitectureFactoryIDs.Not, 1) }},
    { type: `Calculation_Formula`, toDefinition() {
        let operators = [`!`,`*`,`/`,`+`,`-`,`>=`,`<=`,`>`,`<`,`=`,`&`,`|`]
        function ParseFormula(formula, parameters) {
            formula = formula.replaceAll(` `, ``)
            for(let i = 0; i < parameters.length; i++) {
                formula = formula.replaceAll(parameters[i], `param${i}`)
            }
            let operations = []
            let tempIndex = 0
    
            //do parenthesis
            let parenthesisFormulas = formula.split(`)`)
            if(parenthesisFormulas.length !== formula.split(`(`).length)
                return `Parenthesis start and end not matching`
    
            while(formula.split(`)`).flatMap(p => p.split(`(`)).filter(p => operators.some(o => p.indexOf(o) > -1)).length > 1) {
                tempIndex++
                let tempFormula = formula.split(`)`).filter(p => operators.some(o => p.split(`(`).pop()?.indexOf(o) > -1))[0].split(`(`).pop()
                operations.push({
                    resultInto: `$temp${tempIndex}`,
                    parameters: [tempFormula]
                })
                formula = formula.replace(`(${tempFormula})`, `$temp${tempIndex}`)
            }
            if(formula[0] === `(` && formula[formula.length-1] === `)`)
                formula = formula.substring(1,formula.length-1)
            operations.push({
                resultInto: `return`,
                parameters: [formula]
            })
    
            //do operators
            function splitOnOperators(s) {
                for(let operatorIndex in operators) {
                    let operator = operators[operatorIndex]
                    s = s.split(operator).join(`,`)
                }
                return s.split(`,`)
            }
    
            for(let operatorIndex in operators) {
                let operator = operators[operatorIndex]
                let operationIndex
                while((operationIndex = operations.findIndex(f => f.parameters.find(p => p.indexOf(operator) > -1))) > -1) {
                    const formula = operations[operationIndex]
                    const parameterIndex = formula.parameters.findIndex(p => p.indexOf(operator) > -1)
                    const parameter = formula.parameters[parameterIndex]
                    const firstParameter = splitOnOperators(parameter.split(operator)[0]).pop()
                    const secondParameter = splitOnOperators(parameter.split(operator)[1])[0]
                    if(formula.parameters.length > 1 || splitOnOperators(formula.parameters[0].replace(`${firstParameter}${operator}${secondParameter}`, `temp`)).length > 1) {
                        tempIndex++
                        formula.parameters[parameterIndex] = parameter.replace(`${firstParameter}${operator}${secondParameter}`, `$temp${tempIndex}`)
                        operations.splice(operationIndex, 0, {
                            operator,
                            resultInto: `$temp${tempIndex}`,
                            parameters: [firstParameter, secondParameter]
                        })
                    } else {
                        operations[operationIndex].operator = operator
                        operations[operationIndex].parameters = [firstParameter, secondParameter]
                    }
                }
            }
    
            //statics
            let operationIndex
            while((operationIndex = operations.findIndex(f => f.operator !== `s` && f.parameters.find(p => p.match(/^[0-9]+$/)))) > -1) {
                const formula = operations[operationIndex]
                const parameterIndex = formula.parameters.findIndex(p => p.match(/^[0-9]+$/))
                const parameter = formula.parameters[parameterIndex]
    
                tempIndex++
                operations[operationIndex].parameters[parameterIndex] = `$temp${tempIndex}`
                operations.splice(operationIndex, 0, {
                    operator: `s`,
                    resultInto: `$temp${tempIndex}`,
                    parameters: [parameter]
                })
            }
    
            //consolidate temp variables
            tempIndex = 0
            for(let operationIndex in operations) {
                operationIndex = parseInt(operationIndex)
                let formula = operations[operationIndex]
                if(formula.resultInto.indexOf(`$temp`) !== 0)
                    continue
                let nextFormulaParameterIndex
                if  (operations.filter(f => f.parameters.findIndex(p => p === formula.resultInto) > -1).length < 2 && 
                    (nextFormulaParameterIndex = operations[operationIndex+1]?.parameters?.findIndex(p => p === formula.resultInto)) > -1) {
                        operations[operationIndex+1].parameters[nextFormulaParameterIndex] = formula.resultInto = `temp`
                } else {
                    tempIndex++
                    operations.filter(f => f.parameters.findIndex(p => p === formula.resultInto) > -1).forEach(f => { for(let parameterIndex in f.parameters) {
                        if(f.parameters[parameterIndex] === formula.resultInto) 
                            f.parameters[parameterIndex] = `temp${tempIndex}`
                    } })
                    formula.resultInto = `temp${tempIndex}`
                }
            }
    
            for(let i = 0; i < operations.length; i++) {
                operations[i].parameters
                for(let p = 0; p < operations[i].parameters.length; p++) {
                    if(operations[i].parameters[p].indexOf(`param`) === 0) {
                        operations[i].parameters[p] = parameters[parseInt(operations[i].parameters[p].substring(5))]
                    }
                }
            }

            return operations
        }
        let parameters = this.formula.replaceAll(` `, ``)
        for(let operatorIndex in operators) {
            let operator = operators[operatorIndex]
            parameters = parameters.split(operator).join(`,`)
        }
        let parameterSplit = parameters.split(`,`)
        let operatorSplit = this.formula.replaceAll(` `, ``)
        for(let i = 0; i < parameterSplit.length; i++) {
            let loc = operatorSplit.indexOf(parameterSplit[i])
            operatorSplit = operatorSplit.substring(0, loc) + `,` + operatorSplit.substring(loc + parameterSplit[i].length)
        }
        operatorSplit = operatorSplit.split(`,`)
        //allow parenthesis in parameter names
        parameters = ``
        for(let i = 0; i < parameterSplit.length; i++) {
            if(parameters !== ``) parameters += `,`
            parameters += parameterSplit[i]

            if(parameterSplit[i].match(/[^,][(]/) && parameterSplit[i][parameterSplit[i].length - 1] !== `)`) {
                while(++i < parameterSplit.length) {
                    parameters += operatorSplit[i] + parameterSplit[i]
                    if(parameterSplit[i][parameterSplit[i].length - 1] === `)`) break
                }
            }
        }
        parameters = parameters.split(`,`)
        //remove parenthesis operator from parameters
        parameters = parameters.map(s => s[0] === `(` ? s.substring(1) : s)
        parameters = parameters.map(s => {
            while(s[s.length-1] === `)` && s.split(`)`).length > s.split(`(`).length)
                s = s.substring(0, s.length-1)
            return s
        })
        //filter out static values
        parameters = parameters.filter(s => !s.match(/^[0-9]*$/))
        //filter out null parameters
        parameters = parameters.filter(s => s.length !== 0)
        if(parameters.length === 0)
            return
        const operations = ParseFormula(this.formula, parameters)
        if(operations.length == 0 || (operations.length == 1 && operations[0].operator == undefined)) 
            return { ...this.parameterValues[parameters[0]], type: `CalculationOrVariableSelection`, outputVariables: this.outputVariables }
        var group  = { 
            type: `Group`, 
            value: []
        }
        
        let resultName = this.outputVariables?.[0]?.name
        parameters.forEach(parameter => { 
            let name = parameter.indexOf(`temp`) === 0 ? parameter : `${resultName}_${parameter}`
            name = name.substring(0, name.indexOf(`(`) !== -1? name.indexOf(`(`) : name.length)
            group.value.push({ ...this.parameterValues[parameter], type: `CalculationOrVariableSelection`, outputVariables: [ { name } ] }) 
        })
        for(let operationIndex in operations) {
            let operation = operations[operationIndex]
            let operationValue = { outputVariables: operation.resultInto === `return`? this.outputVariables : [ { name: operation.resultInto } ] }
            const parameterToInputVariable = parameter => {
                if(parameter === `self`)
                    return this.outputVariables[0]
                const name = parameter.indexOf(`temp`) === 0 ? parameter : `${resultName}_${parameter}`
                return { name: name.substring(0, name.indexOf(`(`) !== -1? name.indexOf(`(`) : name.length) }
            }
            if(operation.operator === `s`) {
                operationValue.type = `Calculation_Static`
                operationValue.value = operation.parameters[0]
            } else if(operation.operator === `!`) {
                operationValue.type = `Calculation_Not`
                operationValue.inputVariables = [ parameterToInputVariable(operation.parameters[1]) ]
            } else {
                operationValue.inputVariables = operation.parameters.map(parameterToInputVariable)
                switch(operation.operator) {
                    case `*`: 
                        operationValue.type = `Calculation_Multiply`
                        break
                    case `/`: 
                        operationValue.type = `Calculation_Divide`
                        break
                    case `+`: 
                        operationValue.type = `Calculation_Add`
                        break
                    case `-`: 
                        operationValue.type = `Calculation_Subtract`
                        break
                    case `>=`: 
                        operationValue.type = `Calculation_GreaterThanOrEqual`
                        break
                    case `<=`: 
                        operationValue.type = `Calculation_LessThanOrEqual`
                        break
                    case `>`: 
                        operationValue.type = `Calculation_GreaterThan`
                        break
                    case `<`: 
                        operationValue.type = `Calculation_LessThan`
                        break
                    case `=`: 
                        operationValue.type = `Calculation_Equal`
                        break
                    case `&`: 
                        operationValue.type = `Calculation_And`
                        break
                    case `|`: 
                        operationValue.type = `Calculation_Or`
                        break
                }
            }
            group.value.push(operationValue)
        }
        
        return group
    }},
    { type: `CAN_ReadData`, toDefinition() {
        return { type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.CANReadData}, //read factory ID
            { type: `UINT32`, value: (this.canBus << 29) | this.canID}, //bus and identifier
            { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Package}, //package factory ID
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.CANParseData}, //parse factory ID
            { type: `UINT8`, value: this.parseData.length }, //number of parse data values
            ...this.parseData.map(x => { //parse data configuration
                const isBool = x.bitLength < 2
                return { type: `definition`, value: [
                    { type: `FLOAT`, value: x.multiplier}, //muiltiplier
                    { type: `FLOAT`, value: x.adder}, //adder
                    { type: `UINT8`, value: (x.bitLocation) }, //bitLocation
                    { type: `UINT8`, value: (x.bitLength) },
                    { type: `UINT8`, value: (isBool) | //CastToBool
                                            (0 << 1)} //CastToInt
                ]}
            }),
            ...this.parseData.map(x => { //parse storage variables
                const isBool = x.bitLength < 2
                return { type: `VariableId`, value: { name: `${this.name }.${x.name}`, type: isBool? `bool` : undefined, unit: isBool? undefined : x.unit } }
            }),
            { type: `UINT32`, value: 0 } //input data from CAN_READ
        ]}
    }},
    { type: `CAN_WriteData`, toDefinition() {
        let tempIndex = 0
        const packData = this.packData.map(x => { //pack data configuration
            x.variable.outputVariables = [ { name: `temp${tempIndex++}` } ]
        })
        return { type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.Interval}, //interval factory ID
            { type: `FLOAT`, value: 1 / this.interval}, //interval time
            { type: `Group`, value: [//group operation to execute during interval
                ...packData.map(x => { //pack data variable calculations
                    return { ...x.variable, type: `CalculationOrVariableSelection` }
                }),
                { type: `definition`, value: [
                    { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Package}, //package factory ID
                    { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.CANPackData}, //pack factory ID
                    { type: `UINT64`, value: 0}, //base data TODO
                    { type: `UINT8`, value: this.packData.length }, //number of pack data values
                    ...packData.map(x => { //pack data configuration
                        const isBool = x.bitLength < 2
                        return { type: `definition`, value: [
                            { type: `FLOAT`, value: x.multiplier}, //muiltiplier
                            { type: `FLOAT`, value: x.adder}, //adder
                            { type: `UINT8`, value: (x.bitLocation) }, //bitLocation
                            { type: `UINT8`, value: (x.bitLength) },
                            { type: `UINT8`, value: (isBool)} //CastToBool
                        ]}
                    }),
                    { type: `VariableId`, value: { name: `temp` }}, //output to temp
                    ...packData.map(x => { //pack data input variables
                        return { type: `VariableId`, value: x.variable.outputVariables[0] }
                    })
                ]},
                { type: `definition`, value: [
                    { type: `UINT32`, value: OperationArchitectureFactoryIDs.Offset + OperationArchitectureFactoryIDs.Package}, //package factory ID
                    { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.CANWriteData}, //write factory ID
                    { type: `UINT32`, value: (this.canBus << 29) | this.canID}, //bus and identifier
                    { type: `VariableId`, value: { name: `temp` }} // input from temp
                ]}
            ]}
        ]}
    }},
    { type: `Input_Analog`, outputUnits: [`V`], toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.AnalogInput}, //factory ID
            { type: `UINT16`, value: this.pin}, //pin
        ]}, this)
    }},
    { type: `Input_AnalogPolynomial`, toDefinition() {
        const analogInputOutputVariable = { name: this.outputVariables[0].name, unit: `V` }
        return { type: `Group`, value: [
            { ...this.analogInput, type: `Input_Analog`, outputVariables: [ analogInputOutputVariable ]},
            { ...this.polynomial, type: `Calculation_Polynomial`, outputVariables: this.outputVariables, inputVariables: [ analogInputOutputVariable ] }
        ]}
    }},
    { type: `Input_Digital`, toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.DigitalInput}, //factory ID
            { type: `UINT16`, value: this.pin}, //pin
            { type: `BOOL`, value: this.inverted}, //inverted
        ]}, this)
    }},
    { type: `Input_DigitalRecord`, toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.DigitalPinRecord}, //factory ID
            { type: `UINT16`, value: this.pin}, //pin
            { type: `BOOL`, value: this.inverted}, //inverted
            { type: `UINT16`, value: this.length}, //length
        ]}, this)
    }},
    { type: `Input_DutyCycle`, outputUnits: [`%`], toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.DutyCyclePinRead}, //factory ID
            { type: `UINT16`, value: this.pin}, //pin
            { type: `UINT16`, value: this.minFrequency}, //minFrequency
        ]}, this)
    }},
    { type: `Input_Frequency`, outputUnits: [`Hz`], toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.FrequencyPinRead}, //factory ID
            { type: `UINT16`, value: this.pin}, //pin
            { type: `UINT16`, value: this.minFrequency}, //minFrequency
        ]}, this)
    }},
    { type: `Input_PulseWidth`, outputUnits: [`s`], toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.PulseWidthPinRead}, //factory ID
            { type: `UINT16`, value: this.pin}, //pin
            { type: `UINT16`, value: this.minFrequency}, //minFrequency
        ]}, this)
    }},
    { type: `Output_Digital`, toDefinition() {
        return Packagize({ type: `definition`, value: [
            { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.DigitalOutput }, //variable
            { type: `UINT16`, value: this.pin },
            { type: `UINT8`, value: (this.inverted? 0x01 : 0x00) | (this.highZ? 0x02 : 0x00) }
        ]}, this)
    }},
    { type: `Output_PWM`, toDefinition() {
        this.inputVariables ??= [ undefined, undefined ]
        this.inputVariables[0] = { name: `temp0` }
        this.inputVariables[1] = { name: `temp1` }

        return { type: `Group`, value: [
            { ...this.period, type: `CalculationOrVariableSelection`, outputVariables: [ this.inputVariables[0] ] },
            { ...this.pulseWidth, type: `CalculationOrVariableSelection`, outputVariables: [ this.inputVariables[1] ] },
            Packagize({ type: `definition`, value: [
                { type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.PulseWidthPinWrite }, //variable
                { type: `UINT16`, value: this.pin },
                { type: `UINT16`, value: this.minFrequency }
            ]}, this)
        ]}
    }},
    { type: `Reluctor_GM24x`, toDefinition() {
        return ReluctorTemplate.call(
            this,
            { type: `definition`, value: [
                { type: `UINT32`, value: ReluctorFactoryIDs.Offset + ReluctorFactoryIDs.GM24X}, //factory ID
            ]}
        )
    }},
    { type: `Reluctor_Universal1x`, toDefinition() {
        let universal1X = { type: `definition`, value: [ 
            { type: `UINT32`, value: ReluctorFactoryIDs.Offset + ReluctorFactoryIDs.Universal1X}, //factory ID
            { type: `UINT8`, value: this.mode}, //mode
        ]}
        if(this.mode === 0 || this.mode === 1) 
            universal1X.value.push({ type: `FLOAT`, value: this.risingPosition})
        if(this.mode === 0 || this.mode === 2) 
            universal1X.value.push({ type: `FLOAT`, value: this.fallingPosition})
        return ReluctorTemplate.call(
            this,
            universal1X
        )
    }},
    { type: `Reluctor_UniversalMissingTeeth`, toDefinition() {
        return ReluctorTemplate.call(
            this,
            { type: `definition`, value: [ 
                { type: `UINT32`, value: ReluctorFactoryIDs.Offset + ReluctorFactoryIDs.UniversalMissintTooth}, //factory ID
                { type: `FLOAT`, value: this.firstToothPosition}, //FirstToothPosition
                { type: `FLOAT`, value: this.toothWidth}, //ToothWidth
                { type: `UINT8`, value: this.numberOfTeeth}, //NumberOfTeeth
                { type: `UINT8`, value: this.numberOfTeethMissing} //NumberOfTeethMissing
            ]}
        )
    }},
    { type: `TPS_Linear`, toDefinition() {
        this.type = `Input_AnalogPolynomial`
        return this
    }},
    { type: `MAP_GM1Bar`, toDefinition() {
        this.type = `Input_AnalogPolynomial`
        return this
    }},
    { type: `MAP_GM2Bar`, toDefinition() {
        this.type = `Input_AnalogPolynomial`
        return this
    }},
    { type: `MAP_GM3Bar`, toDefinition() {
        this.type = `Input_AnalogPolynomial`
        return this
    }},
    { type: `MAP_Linear`, toDefinition() {
        this.type = `Input_AnalogPolynomial`
        return this
    }},
    { type: `Input`, toDefinition() {
        if(this.translationConfig == undefined)
            return
        const translationOutputVariable = { name: `Inputs.${this.name}`, unit: this.translationConfig.outputUnits?.[0], type: this.translationConfig.outputTypes?.[0] }

        if((this.translationConfig.inputTypes?.length ?? 0) === 0 && (this.translationConfig.inputUnits?.length ?? 0) === 0)
            return { ...this.translationConfig, type: `CalculationOrVariableSelection`, outputVariables: [ translationOutputVariable ] }

        const rawOutputVariable = { name: `Inputs.${this.name}`, unit: this.rawConfig.outputUnits?.[0], type: this.rawConfig.outputTypes?.[0] }

        this.rawConfig = { ...this.rawConfig, type: `CalculationOrVariableSelection`, outputVariables: [ rawOutputVariable ] }
        
        return { type: `Group`, value: [
            { ...this.rawConfig, type: `CalculationOrVariableSelection` },
            { ...this.translationConfig, type: `CalculationOrVariableSelection`, outputVariables: [ translationOutputVariable ], inputVariables: [ rawOutputVariable ] }
        ]}
    }},
    { type: `Inputs`, toDefinition() {
        return { 
            type: `ConfigList`, 
            value: this.value,
            itemType: `Input`
        }
    }},
    { type: `CylinderAirmass_AlphaN`, outputUnits: [`g`], toDefinition() {
        return { ...this.Airmass, type: `CalculationOrVariableSelection`, outputVariables: this.outputVariables }
    }},
    { type: `CylinderAirmass_SpeedDensity`, outputUnits: [`g`], toDefinition() {
        this.inputVariables = [ 
            { name: `EngineParameters.Cylinder Air Temperature`, unit: `C` },
            { name: `EngineParameters.Manifold Absolute Pressure`, unit: `Bar` },
            { name: `EngineParameters.Volumetric Efficiency`, unit: `[0.0-1.0]` }
        ]
        return Packagize({ type: `definition`, value: [ 
            { type: `UINT32`, value: EngineFactoryIDs.Offset + EngineFactoryIDs.CylinderAirMass_SD },  //factory id
            { type: `FLOAT`, value: this.CylinderVolume }, //Cylinder Volume
        ]}, this)
    }},
    { type: `InjectorPulseWidth_DeadTime`, outputUnits: [`s`], toDefinition() {
        return { type: `Group`, value: [
            { ...this.FlowRate, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `FuelParameters.Injector Flow Rate`, unit: `g/s` } ] },
            { ...this.DeadTime, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `FuelParameters.Injector Dead Time`, unit: `s` } ] },
            //Store a value of 2 into the temporary variable which will be used for SquirtsPerCycle (2 squirts per cycle default)
            { type: `Calculation_Static`, value: 2, outputVariables: [ { name: `SquirtsPerCycle` } ] },//static value of 2
            //Subtract 1 to temporary variable if Engine is running sequentially. This will be used for SquirtsPerCycle (1 squirts per cycle when sequential)
            { 
                type: `Calculation_Subtract`,
                outputVariables: [ { name: `SquirtsPerCycle` } ], //Return
                inputVariables: [
                    { name: `SquirtsPerCycle` },
                    { name: `EngineSequentialId`, type: `bool` }
                ]
            },
            Packagize({ type: `definition`, value: [ 
                { type: `UINT32`, value: EngineFactoryIDs.Offset + EngineFactoryIDs.InjectorDeadTime },
                { type: `FLOAT`, value: this.MinInjectorFuelMass }
            ]},{
                ...this,
                inputVariables: [ 
                    { name: `SquirtsPerCycle` },
                    { name: `FuelParameters.Cylinder Fuel Mass`, unit: `g` },
                    { name: `FuelParameters.Injector Flow Rate`, unit: `g/s` },
                    { name: `FuelParameters.Injector Dead Time`, unit: `s` }
                ]
            })
        ]}
    }},
    { type: `ConfigList`, toDefinition() {
        return { type: `Group`, value: this.value.map(x => {
            const keys = Object.keys(x)
            const staticItem = this.staticItems?.find(x => x.name === keys[0])
            if(keys.length === 1 && staticItem !== undefined) {
                if(Array.isArray(x[staticItem.name]) || typeof x[staticItem.name] !== `object`)
                    return { value: x[staticItem.name], type: staticItem.type }
                return { ...x[staticItem.name], type: staticItem.type }
            }
            return { ...x, type: this.itemType }
        }), staticItems: undefined, itemType: undefined}
    }},
    { type: `Fuel`, toDefinition() {
        return { 
            types : [{ type: `Fuel_InjectorOutput`, toDefinition() {
                return { type: `definition`, value: [ {
                    type: `Package`,
                    value: [ 
                        { type: `UINT32`, value: EngineFactoryIDs.Offset + EngineFactoryIDs.ScheduleInjection }, //factory id
                        { type: `FLOAT`, value: this.TDC }, //tdc
                        { type: `UINT8`, value: this.InjectAt },
                        { ...this, type: `CalculationOrVariableSelection` },
                    ],
                    outputVariables: [ 
                        { name: `temp` }, //store in temp variable
                        { name: `temp` } //store in temp variable
                    ],
                    inputVariables: [
                        { name: `EnginePositionId`, type: `EnginePosition` },
                        { name: `FuelParameters.Injector Enable`, type: `bool` },
                        { name: `FuelParameters.Injector Pulse Width`, unit: `s` },
                        { name: `FuelParameters.Injector Position`, unit: `°` }
                    ]
                }]}
            }},
            { type: `Fuel_AFR`, toDefinition() {
                return { type: `Group`, value: [
                    { ...this, type: `Fuel_GenericCalculation` },
                    { 
                        type: `Calculation_Divide`,
                        outputVariables: [ { name: `FuelParameters.Cylinder Fuel Mass`, unit: `g` } ],
                        inputVariables: [
                            { name: `EngineParameters.Cylinder Air Mass`, unit: `g` },
                            { name: `FuelParameters.Air Fuel Ratio`, unit: `:1` }
                        ]
                    }
                ] }
            }}, 
            { type: `Fuel_InjectorProperties`, toDefinition() {
                return { type: `Group`, value: [
                    { ...this.InjectorEnable, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `FuelParameters.Injector Enable`, type: `bool` } ] }, 
                    { ...this.InjectorPulseWidth, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `FuelParameters.Injector Pulse Width`, unit: `s` } ] }, 
                    { ...this.InjectorPosition, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `FuelParameters.Injector Position`, unit: `°` } ] }, 
                ]}
            }}, 
            { type: `Fuel_InjectorOutputs`, toDefinition() {
                return { type: `Group`, value: this.value.map(x => { return { ...x, type: `Fuel_InjectorOutput` }}) }
            }}, 
            { type: `Fuel_GenericCalculation`, toDefinition() {
                return { ...this, type: `GenericCalculation`, outputVariables: [ { name: `FuelParameters.` } ] }
            }}],
            type: `ConfigList`, 
            value: this.value,
            itemType: `Fuel_GenericCalculation`,
            staticItems: [
                { name: `AFR`, type: `Fuel_AFR` },
                { name: `InjectorProperties`, type: `Fuel_InjectorProperties` },
                { name: `InjectorOutputs`, type: `Fuel_InjectorOutputs` }
            ]
        }
    }},
    { type: `Ignition`, toDefinition() {
        return { 
            types : [{ type: `Ignition_IgnitionOutput`, toDefinition() {
                return { type: `definition`, value: [ {
                    type: `Package`,
                    value: [ 
                        { type: `UINT32`, value: EngineFactoryIDs.Offset + EngineFactoryIDs.ScheduleIgnition }, //factory id
                        { type: `FLOAT`, value: this.TDC }, //tdc
                        { ...this, type: `CalculationOrVariableSelection` },
                    ],
                    outputVariables: [ 
                        { name: `temp` }, //store in temp variable
                        { name: `temp` } //store in temp variable
                    ],
                    inputVariables: [
                        { name: `EnginePositionId`, type: `EnginePosition` },
                        { name: `IgnitionParameters.Ignition Enable`, type: `bool` },
                        { name: `IgnitionParameters.Ignition Dwell`, unit: `s` },
                        { name: `IgnitionParameters.Ignition Advance`, unit: `°` },
                        { name: `IgnitionParameters.Ignition Dwell Deviation`, unit: `s` }
                    ]
                }]}
            }},
            { type: `Ignition_IgnitionProperties`, toDefinition() {
                return { type: `Group`, value: [
                    { ...this.IgnitionEnable, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `IgnitionParameters.Ignition Enable`, type: `bool` } ] }, 
                    { ...this.IgnitionAdvance, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `IgnitionParameters.Ignition Advance`, unit: `°` } ] },
                    { ...this.IgnitionDwell, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `IgnitionParameters.Ignition Dwell`, unit: `s` } ] },
                    { ...this.IgnitionDwellDeviation, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `IgnitionParameters.Ignition Dwell Deviation`, unit: `s` } ] },
                ]}
            }},
            { type: `Ignition_IgnitionOutputs`, toDefinition() {
                return { type: `Group`, value: this.value.map(x => { return { ...x, type: `Ignition_IgnitionOutput` }}) }
            }}, 
            { type: `Ignition_GenericCalculation`, toDefinition() {
                return { ...this, type: `GenericCalculation`, outputVariables: [ { name: `IgnitionParameters.` } ] }
            }}],
            type: `ConfigList`, 
            value: this.value,
            itemType: `Ignition_GenericCalculation`,
            staticItems: [
                { name: `IgnitionProperties`, type: `Ignition_IgnitionProperties` },
                { name: `IgnitionOutputs`, type: `Ignition_IgnitionOutputs` }
            ]
        }
    }},
    { type: `Engine`, toDefinition() {
        return { 
            types : [{ type: `Engine_EngineSensors`, toDefinition() {
                let group = { type: `Group`, value: [
                    { ...this.CrankPosition, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `EngineParameters.Crank Position`, type: `ReluctorResult` } ] },
                    { ...this.CamPosition, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `EngineParameters.Cam Position`, type: `ReluctorResult` } ] },
        
                    //CalculateEnginePosition
                    { 
                        type: `Package`,
                        value: [ 
                            { type: `UINT32`, value: EngineFactoryIDs.Offset + ( this.CrankPriority? EngineFactoryIDs.PositionCrankPriority : EngineFactoryIDs.PositionCamPriority) },  //factory id
                        ],
                        outputVariables: [ { name: `EnginePositionId`, type: `EnginePosition` } ],
                        inputVariables: [
                            { name: `EngineParameters.Crank Position`, type: `ReluctorResult` },
                            { name: `EngineParameters.Cam Position`, type: `ReluctorResult` }
                        ]
                    },
        
                    //EngineParameters
                    { 
                        type: `Package`,
                        value: [ 
                            { type: `UINT32`, value: EngineFactoryIDs.Offset + EngineFactoryIDs.EngineParameters },  //factory id
                        ],
                        outputVariables: [ 
                            { name: `EngineParameters.Engine Speed`, unit: `RPM` },
                            { name: `EngineSequentialId`, type: `bool` },
                            { name: `EngineSyncedId`, type: `bool` }
                        ],
                        inputVariables: [ { name: `EnginePositionId`, type: `EnginePosition` } ]
                    }
                ]}
        
                if(this.ManifoldAbsolutePressure !== undefined) {
                    group.value.push({ ...this.ManifoldAbsolutePressure, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `EngineParameters.Manifold Absolute Pressure`, unit: `Bar` } ] })
                }
                
                if(this.ThrottlePosition !== undefined) {
                    group.value.push({ ...this.ThrottlePosition, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `EngineParameters.Throttle Position`, unit: `[0.0-1.0]` } ] })
                }

                if(this.CylinderAirTemperature !== undefined) {
                    group.value.push({ ...this.CylinderAirTemperature, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `EngineParameters.Cylinder Air Temperature`, unit: `C` } ] })
                }
                return group
            }},
            { type: `Engine_EngineCalculations`, toDefinition() {
                let group = { type: `Group`, value: []}
        
                if(this.VolumetricEfficiency !== undefined) {
                    group.value.push({ ...this.VolumetricEfficiency, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `EngineParameters.Volumetric Efficiency`, unit: `[0.0-1.0]` } ] })
                }
                
                group.value.push({ ...this.CylinderAirmass, type: `CalculationOrVariableSelection`, outputVariables: [ { name: `EngineParameters.Cylinder Air Mass`, unit: `g` } ] })

                return group
            }}, 
            { type: `Engine_GenericCalculation`, toDefinition() {
                return { ...this, type: `GenericCalculation`, outputVariables: [ { name: `EngineParameters.` } ] }
            }}],
            type: `ConfigList`, 
            value: this.value,
            itemType: `Engine_GenericCalculation`,
            staticItems: [
                { name: `EngineSensors`, type: `Engine_EngineSensors` },
                { name: `EngineCalculations`, type: `Engine_EngineCalculations` }
            ]
        }
    }},
    { type: `CAN`, toDefinition() {
        return { 
            types : [{ type: `CAN_GenericCalculation`, toDefinition() {
                return { ...this, type: `GenericCalculation`, outputVariables: [ { name: `CANParameters.` } ] }
            }}],
            type: `ConfigList`, 
            value: this.value,
            itemType: `CAN_GenericCalculation`
        }
    }},
    { type: `Outputs`, toDefinition() {
        return { 
            types : [{ type: `Output_GenericCalculation`, toDefinition() {
                return { ...this, type: `GenericCalculation`, outputVariables: [ { name: `Outputs.` } ] }
            }}],
            type: `ConfigList`, 
            value: this.value,
            itemType: `Output_GenericCalculation`
        }
    }},
    { type: `TopEngine`, toDefinition() {
        BuildRegister = new VariableRegistry()
        BuildRegister.CreateIfNotFound = true;
        return { type: `definition`, value: [
            { type: `UINT32`, value: 0}, //signal last operation

            //inputs
            { type: `Group`, value: [
                { type: `Package`, //Package
                    value: [{ type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.GetTick }], //GetTick factory ID
                    outputVariables: [ { name: `CurrentTick`, type: `tick` } ]
                }, 
                { type: `Inputs`, value: this.Inputs }, 
                this.CANAvailable? { type: `CAN`, value: this.CAN } : undefined,
                { type: `Engine`, value: this.Engine },
            ]},

            //preSync
            { type: `Group`, value: [ ] },

            //sync condition
            { type: `Group`, value: [ 
                { type: `Calculation_Static`, value: false, outputVariables: [ { name: `temp` } ] }, //store static variable in temp variable
                { type: `Calculation_Or`, inputVariables: [ { name: `EngineSyncedId` }, { name: `temp` } ] },
            ]},

            //main loop execute
            { type: `Group`, value: [ 
                { type: `Fuel`, value: this.Fuel },
                { type: `Ignition`, value: this.Ignition }
            ]},
        ]}
    }, toArrayBuffer() {
        let buf = buildConfig({ type:`definition`, value: [ this ], types: types })
        buf = new Uint32Array([buf.byteLength]).buffer.concatArray(buf)
        buf = buf.concatArray(new Uint32Array([buf.crc32()]).buffer)

        let bufMeta = pako.gzip(new TextEncoder().encode(JSON.stringify(BuildRegister.GetVariableReferenceList()))).buffer
        bufMeta = new Uint32Array([bufMeta.byteLength]).buffer.concatArray(bufMeta)
        bufMeta = bufMeta.concatArray(new Uint32Array([bufMeta.crc32()]).buffer)

        return buf.concatArray(bufMeta)
    }},
    { type: `TopExpander`, toDefinition() {
        BuildRegister = new VariableRegistry()
        BuildRegister.CreateIfNotFound = true;
        return { type: `definition`, value: [
            { type: `UINT32`, value: 0}, //signal last operation

            //main loop execute
            { type: `Group`, value: [
                { type: `Package`, //Package
                    value: [{ type: `UINT32`, value: EmbeddedOperationsFactoryIDs.Offset + EmbeddedOperationsFactoryIDs.GetTick }], //GetTick factory ID
                    outputVariables: [ { name: `CurrentTick`, type: `tick` } ]
                }, 
                { type: `Inputs`, value: this.Inputs }, 
                { type: `CAN`, value: this.CAN },
                { type: `Outputs`, value: this.Outputs }
            ]},
        ]}
    }, toArrayBuffer() {
        let buf = buildConfig({ type:`definition`, value: [ this ], types: types })
        buf = new Uint32Array([buf.byteLength]).buffer.concatArray(buf)
        buf = buf.concatArray(new Uint32Array([buf.crc32()]).buffer)

        let bufMeta = pako.gzip(new TextEncoder().encode(JSON.stringify(BuildRegister.GetVariableReferenceList()))).buffer
        bufMeta = new Uint32Array([bufMeta.byteLength]).buffer.concatArray(bufMeta)
        bufMeta = bufMeta.concatArray(new Uint32Array([bufMeta.crc32()]).buffer)

        return buf.concatArray(bufMeta)
    }},
]

for(var index in STM32TypeAlignment) {
    var type = types.find(x => x.type == x86TypeAlignment[index].type)
    if(type){
        type.align = x86TypeAlignment[index].align
    }
}