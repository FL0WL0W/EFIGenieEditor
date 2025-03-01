import { objectTester } from "../JavascriptUI/UIUtils"
import UISelection from "../JavascriptUI/UISelection"

function PerSecond(units)
{
    return units.map(value => { return { name: value.name + `/s`, SIMultiplier: value.SIMultiplier, SIOffset: value.SIOffset } } )
}

let BlankUnits = [ { name: ``, SIMultiplier: 1, SIOffset: 0} ]
let PercentUnits = [ { name: `%`, SIMultiplier: 100, SIOffset: 0 }, { name: `[0.0-1.0]`, SIMultiplier: 1, SIOffset: 0} ]
let PercentageAccelerationUnits = PerSecond(PercentUnits)// [ { name: `(0.0-1.0)/s`, SIMultiplier: 1, SIOffset: 0}, { name: `%/s`, SIMultiplier: 100, SIOffset: 0 } ]
let TimeUnits = [ { name: `s`, SIMultiplier: 1, SIOffset: 0 }, { name: `ms`, SIMultiplier: 1000, SIOffset: 0 }, { name: `us`, SIMultiplier: 1000000, SIOffset: 0 }, { name: `ns`, SIMultiplier: 1000000000, SIOffset: 0 } ]
let FrequencyUnits = [ { name: `Hz`, SIMultiplier: 1, SIOffset: 0 }, { name: `KHz`, SIMultiplier: 0.001, SIOffset: 0 }, { name: `MHz`, SIMultiplier: 0.000001, SIOffset: 0 } ]
let AngleUnits = [ { name: `°`, SIMultiplier: 1, SIOffset: 0 } ]
let VoltageUnits = [ { name: `V`, SIMultiplier: 1, SIOffset: 0 }, { name: `mV`, SIMultiplier: 1000, SIOffset: 0 } ]
let PressureUnits = [ { name: `Bar`, SIMultiplier: 1, SIOffset: 0 }, { name: `kPa`, SIMultiplier: 100, SIOffset: 0 }, { name: `PSI`, SIMultiplier: 14.5038, SIOffset: 0 } ]
let AngularSpeedUnits = [ { name: `RPM`, SIMultiplier: 1, SIOffset: 0 } ]
let SpeedUnits = [ { name: `KPH`, SIMultiplier: 1, SIOffset: 0 }, { name: `MPH`, SIMultiplier: 0.621371, SIOffset: 0 } ]
let TemperatureUnits = [ { name: `°C`, SIMultiplier: 1, SIOffset: 0 }, { name: `°F`, SIMultiplier: 1.8, SIOffset: 32 } ]
let GasConstantUnits = [ { name: `J/kg K`, SIMultiplier: 1, SIOffset: 0 }, { name: `kJ/kg K`, SIMultiplier: 0.1, SIOffset: 0 } ]
let MassUnits = [ { name: `g`, SIMultiplier: 1, SIOffset: 0 }, { name: `mg`, SIMultiplier: 1000, SIOffset: 0 }, { name: `kg`, SIMultiplier: 0.001, SIOffset: 0 } ]
let Ratio = [ { name: `:1`, SIMultiplier: 1, SIOffset: 0 } ]
let CycleUnits = [ { name: `Cycles`, SIMultiplier: 1, SIOffset: 0 } ]
let LambdaUnits = [ { name: `λ`, SIMultiplier: 1, SIOffset: 0 } ]
let VolumeUnits = [ { name: `L`, SIMultiplier: 1, SIOffset: 0 }, { name: `mL`, SIMultiplier: 1000, SIOffset: 0 } ]
let MassFlowUnits = [ { name: `g/s`, SIMultiplier: 1, SIOffset: 0 }, { name: `g/min`, SIMultiplier: 60, SIOffset: 0 } ]
let ResistanceUnits = [ { name: `Ω`, SIMultiplier: 1, SIOffset: 0 }, { name: `kΩ`, SIMultiplier: 0.001, SIOffset: 0 } ]

export let Measurements = {
    'No Unit': BlankUnits,
    Voltage: VoltageUnits,
    Temperature: TemperatureUnits,
    Pressure: PressureUnits,
    Mass: MassUnits,
    MassFlow: MassFlowUnits,
    Volume: VolumeUnits,
    Speed: SpeedUnits,
    Time: TimeUnits,
    Frequency: FrequencyUnits,
    Percentage: PercentUnits,
    PercentageAcceleration: PercentageAccelerationUnits,
    Lambda: LambdaUnits,
    Angle: AngleUnits,
    AngularSpeed: AngularSpeedUnits,
    Ratio: Ratio,
    Resistance: ResistanceUnits,
}

export function GetDefaultMinMaxStepRedlineFromUnit(unit) {
    switch(unit){
        case `%`:           return { min: 0,      max: 100,       step: 10,       lowRedline: undefined,    highRedline: undefined }
        case `[0.0-1.0]`:   return { min: 0,      max: 1,         step: 0.1,      lowRedline: undefined,    highRedline: undefined }
        case `RPM`:         return { min: 0,      max: 8000,      step: 1000,     lowRedline: undefined,    highRedline: 6500      }
        case `Bar`:         return { min: 0.2,    max: 3,         step: 0.2,      lowRedline: 0.25,         highRedline: undefined }
        case `kPa`:         return { min: 20,     max: 300,       step: 20,       lowRedline: 25,           highRedline: undefined }
        case `V`:           return { min: 0,      max: 5,         step: 1,        lowRedline: undefined,    highRedline: undefined }
        case `mV`:          return { min: 0,      max: 5000,      step: 1000,     lowRedline: undefined,    highRedline: undefined }
    }
}

export function GetUnitFromName(unitName) { return unitName == undefined? undefined :
    Measurements[GetMeasurementNameFromUnitName(unitName)]?.find(u => u.name === unitName) ?? 
    Measurements[GetMeasurementNameFromUnitName(unitName)]?.find(u => u.name === `°${unitName}`) ?? 
    BlankUnits[0] }

export function GetMeasurementNameFromUnitName(unit){
    if(Array.isArray(unit))
        return unit.map(x => GetMeasurementNameFromUnitName(x))
    for(let measurementName in Measurements) {
        for(let measurementIndex in Measurements[measurementName]) {
            if(unit === Measurements[measurementName][measurementIndex].name)
                return measurementName
        }
    }
    for(let measurementName in Measurements) {
        for(let measurementIndex in Measurements[measurementName]) {
            if(`°${unit}` === Measurements[measurementName][measurementIndex].name)
                return measurementName
        }
    }
    return `None`
}

export function ConvertValueFromUnitToUnit(value, fromUnit, toUnit) {
    let fromMeasurement = GetMeasurementNameFromUnitName(fromUnit)
    fromUnit = GetUnitFromName(fromUnit)
    let toMeasurement = GetMeasurementNameFromUnitName(toUnit)
    toUnit = GetUnitFromName(toUnit)
    if(value == undefined || fromUnit == undefined || toUnit == undefined || fromMeasurement !== toMeasurement || fromUnit === toUnit)
        return value
    if(Array.isArray(value))
        return value.map(x => x == undefined? x : (x - fromUnit.SIOffset) / fromUnit.SIMultiplier * toUnit.SIMultiplier + toUnit.SIOffset)
    return (value - fromUnit.SIOffset) / fromUnit.SIMultiplier * toUnit.SIMultiplier + toUnit.SIOffset
}

function GetDefaultUnitFromMeasurement(measurement) {
    if(Array.isArray(measurement)) measurement = measurement[0]
    return Measurements[measurement]?.[0]?.name
}

export default class UIUnit extends UISelection {
    static allMeasurementOptions = Object.keys(Measurements).map(measurement => { 
        if(Measurements[measurement].length === 0 || (Measurements[measurement].length === 1 && Measurements[measurement][0].name === ``))
            return { name: measurement, value: `` }
        if(Measurements[measurement].length === 1)
            return { selectedName: Measurements[measurement][0].name, name: `${measurement} [${Measurements[measurement][0].name}]`, value: Measurements[measurement][0].name }

        return { group: measurement, options: Measurements[measurement]?.map(unit => { return { selectedName: unit.name, name: `${unit.name}`, value: unit.name } }) } 
    })

    _hidden = false
    get hidden() { return this._hidden }
    set hidden(hidden) {
        this._hidden = hidden
        if(hidden || this.options.length === 0) super.hidden = true
        else super.hidden = false
    }

    get value() { return super.value }
    set value(value) {
        super.value = value
    }

    _measurement
    get measurement() { return Array.isArray(this._measurement)? this._measurement.find(x => x === GetMeasurementNameFromUnitName(this.value)) : this._measurement }
    set measurement(measurement){
        if(objectTester(this._measurement, measurement)) return
        if(!measurement) {
            this.options = UIUnit.allMeasurementOptions
            this.default = ``
        } else {
            this._measurement = measurement
            if(GetMeasurementNameFromUnitName(this.default) !== measurement)
                this.default = GetDefaultUnitFromMeasurement(measurement)
            if(!Array.isArray(measurement))
                measurement = [measurement]
            if(measurement.length > 1)
                this.options = UIUnit.allMeasurementOptions.filter(x => measurement.indexOf(x.group) !== -1 || measurement.some(y=>x.name?.indexOf(y) === 0))
                    .map(x=> x.group? { group: x.group, options: x.options.map(y=> { return { ...y, selectedName: undefined} } ) } : { ...x, selectedName: x.value === ``? x.selectedName : x.value } )
            else
                this.options = Measurements[measurement[0]]?.map(unit => { return { name: unit.name, value: unit.name } })
            if(this.selectedOption == undefined)
                this.value = this.default
        }
        if(this.value == undefined || this.value === `` || this.value === null) this.value = this.default
        if(this.options.length === 0) super.hidden = true
        else if(!this.hidden) super.hidden = false
        this.dispatchEvent(new Event(`change`, {bubbles: true}))
    }

    get saveValue() {
        if(this.value === this.default) return
        return super.saveValue
    }
    set saveValue(saveValue) {
        if(saveValue == undefined || saveValue === ``) return
        super.saveValue = saveValue
    }

    constructor(prop) {
        prop ??= {}
        prop.options ??= UIUnit.allMeasurementOptions
        super(prop)
        if(prop?.measurement || prop?.value) this.default = this.value
        this.class = `ui unit`
        this.selectHidden = true
    }
}
customElements.define(`ui-unit`, UIUnit, { extends: `div` })