import { objectTester } from "../JavascriptUI/UIUtils"
import UITable from "../JavascriptUI/UITable"
import UITemplate from "../JavascriptUI/UITemplate"
import UIUnit, { GetMeasurementNameFromUnitName, ConvertValueFromUnitToUnit } from "./UIUnit"
export default class UITableWithUnit extends UITemplate {
    static template = `<div data-element="displayValueElement">`
    
    get zLabel() { return this.#zLabel; }
    set zLabel(zLabel) {
        if(this.#zLabel === zLabel)
            return;
        this.#zLabel = zLabel;
        this.#zLabelElement.replaceChildren(zLabel ?? ``);
    }
    get measurement() { return this.displayUnitElement.measurement }
    set measurement(measurement) { this.displayUnitElement.measurement = measurement }
    get displayUnit() { return this.displayUnitElement.value }
    set displayUnit(displayUnit) { this.displayUnitElement.value = displayUnit ?? this._valueUnit }
    get displayValue() { return this.displayValueElement.value }
    set displayValue(displayValue) { this.displayValueElement.value = displayValue }

    _valueUnit
    get valueUnit() { return this._valueUnit ?? this.displayUnit }
    set valueUnit(valueUnit) { 
        if(this._valueUnit === valueUnit) return
        let newValue = ConvertValueFromUnitToUnit(this.value, this._valueUnit, valueUnit)
        this._valueUnit = valueUnit
        this.displayUnit ??= valueUnit
        this.value = newValue
    }
    #value
    get value() { return this.#value }
    set value(value) {
        if(objectTester(this.#value, value)) return
        this.#value = value
        this.displayValue           = ConvertValueFromUnitToUnit(value, this.valueUnit, this.displayUnit)
        this.UpdateDisplayValue()
    }

    _xResolutionModifiable  = true
    get xResolutionModifiable() { return this._xResolutionModifiable }
    set xResolutionModifiable(xResolutionModifiable) { 
        this._xResolutionModifiable = xResolutionModifiable
        this.displayValueElement.xResolutionModifiable = window.EnumRegister?.isEnum(this.xUnit) ? false : xResolutionModifiable
    }
    get xResolution() { return this.displayValueElement.xResolution }
    set xResolution(xResolution) { this.displayValueElement.xResolution = xResolution }
    get xLabel() { return this.#xLabel; }
    set xLabel(xLabel) {
        if(this.#xLabel === xLabel)
            return;
        this.#xLabel = xLabel;
        this.#xLabelElement.replaceChildren(xLabel ?? ``);
    }
    get xMeasurement() { return this.xDisplayUnitElement.measurement }
    set xMeasurement(xMeasurement) { this.xDisplayUnitElement.measurement = xMeasurement }
    get xDisplayUnit() { return this.xDisplayUnitElement.value }
    set xDisplayUnit(xDisplayUnit) { this.xDisplayUnitElement.value = xDisplayUnit }
    get xDisplayAxis() { return this.displayValueElement.xAxis }
    set xDisplayAxis(xDisplayAxis) { this.displayValueElement.xAxis = xDisplayAxis }
    _xAxisModifiable  = true
    get xAxisModifiable() { return this._xAxisModifiable }
    set xAxisModifiable(xAxisModifiable) { 
        this._xAxisModifiable = xAxisModifiable
        this.displayValueElement.xAxisModifiable = window.EnumRegister?.isEnum(this.xUnit) ? false : xAxisModifiable
    }

    _xUnit
    get xUnit() { return Array.isArray(this._xUnit)? (this._xUnit.find(x => GetMeasurementNameFromUnitName(x) === GetMeasurementNameFromUnitName(this.xDisplayUnit)) ?? this._xUnit[0]) : (this._xUnit ?? this.xDisplayUnit) }
    set xUnit(xUnit) { 
        if(objectTester(this._xUnit, xUnit)) return

        const newUnit = Array.isArray(xUnit)? (xUnit.find(x => GetMeasurementNameFromUnitName(x) === GetMeasurementNameFromUnitName(this.xDisplayUnit)) ?? xUnit[0]) : xUnit
        let newAxis
        if(window.EnumRegister?.isEnum(newUnit)) {
            newAxis = window.EnumRegister.getEnum(newUnit)?.map(enumEntry => {
                return enumEntry.value
            })
            this.displayValueElement.xResolutionModifiable = false
            this.displayValueElement.xAxisModifiable = false
        } else {
            this.displayValueElement.xResolutionModifiable = this.xResolutionModifiable
            this.displayValueElement.xAxisModifiable = this.xAxisModifiable
            newAxis = ConvertValueFromUnitToUnit(this.xAxis, this._xUnit, newUnit)
        }
        this._xUnit = xUnit
        this.xDisplayUnit ??= Array.isArray(xUnit)? xUnit[0] : xUnit
        this.xAxis = newAxis
        this.UpdateDisplayValue()
    }
    #xAxis
    get xAxis() { return this.#xAxis }
    set xAxis(xAxis) {
        if(objectTester(this.#xAxis, xAxis)) return
        this.#xAxis = xAxis
        this.UpdateDisplayValue()
    }

    get yResolutionModifiable() { return this._yResolutionModifiable }
    set yResolutionModifiable(yResolutionModifiable) { 
        this._yResolutionModifiable = yResolutionModifiable
        this.displayValueElement.yResolutionModifiable = window.EnumRegister?.isEnum(this.yUnit) ? false : yResolutionModifiable
    }
    get yResolution() { return this.displayValueElement.yResolution }
    set yResolution(yResolution) { this.displayValueElement.yResolution = yResolution }
    get yLabel() { return this.#yLabel; }
    set yLabel(yLabel) {
        if(this.#yLabel === yLabel)
            return;
        this.#yLabel = yLabel;
        this.#yLabelElement.replaceChildren(yLabel ?? ``);
    }
    get yMeasurement() { return this.yDisplayUnitElement.measurement }
    set yMeasurement(yMeasurement) { this.yDisplayUnitElement.measurement = yMeasurement }
    get yDisplayUnit() { return this.yDisplayUnitElement.value }
    set yDisplayUnit(yDisplayUnit) { this.yDisplayUnitElement.value = yDisplayUnit }
    get yDisplayAxis() { return this.displayValueElement.yAxis }
    set yDisplayAxis(yDisplayAxis) { this.displayValueElement.yAxis = yDisplayAxis }
    _yAxisModifiable  = true
    get yAxisModifiable() { return this._yAxisModifiable }
    set yAxisModifiable(yAxisModifiable) { 
        this._yAxisModifiable = yAxisModifiable
        this.displayValueElement.yAxisModifiable = window.EnumRegister?.isEnum(this.yUnit) ? false : yAxisModifiable
    }

    _yUnit
    get yUnit() { return Array.isArray(this._yUnit)? (this._yUnit.find(x => GetMeasurementNameFromUnitName(x) === GetMeasurementNameFromUnitName(this.yDisplayUnit)) ?? this._yUnit[0]) : (this._yUnit ?? this.yDisplayUnit) }
    set yUnit(yUnit) { 
        if(objectTester(this._yUnit, yUnit)) return

        const newUnit = Array.isArray(yUnit)? (yUnit.find(x => GetMeasurementNameFromUnitName(x) === GetMeasurementNameFromUnitName(this.yDisplayUnit)) ?? yUnit[0]) : yUnit
        let newAxis
        if(window.EnumRegister?.isEnum(newUnit)) {
            newAxis = window.EnumRegister.getEnum(newUnit)?.map(enumEntry => {
                return enumEntry.value
            })
            this.displayValueElement.yResolutionModifiable = false
            this.displayValueElement.yAxisModifiable = false
        } else {
            this.displayValueElement.yResolutionModifiable = this.yResolutionModifiable
            this.displayValueElement.yAxisModifiable = this.yAxisModifiable
            newAxis = ConvertValueFromUnitToUnit(this.yAxis, this._yUnit, newUnit)
        }
        this._yUnit = yUnit
        this.yDisplayUnit ??= Array.isArray(yUnit)? yUnit[0] : yUnit
        this.yAxis = newAxis
        this.UpdateDisplayValue()
    }
    #yAxis
    get yAxis() { return this.#yAxis }
    set yAxis(yAxis) {
        if(objectTester(this.#yAxis, yAxis)) return
        this.#yAxis = yAxis
        this.UpdateDisplayValue()
    }

    get selecting() { return this.displayValueElement.selecting }
    set selecting(selecting) { this.displayValueElement.selecting = selecting }

    #min
    get min() { return this.#min }
    set min(min) {
        if(this.#min === min) return
        this.#min = min
        this.UpdateDisplayValue()
    }

    #max
    get max() { return this.#max }
    set max(max) {
        if(this.#max === max) return
        this.#max = max
        this.UpdateDisplayValue()
    }

    #step
    get step() { return this.#step }
    set step(step) {
        if(this.#step === step) return
        this.#step = step
        this.UpdateDisplayValue()
    }
    
    #xLabelElementWithUnit = document.createElement(`div`);
    #xLabelElement = document.createElement(`span`);
    #xLabel = `X`
    #yLabelElementWithUnit = document.createElement(`div`);
    #yLabelElement = document.createElement(`span`);
    #yLabel = `Y`
    #zLabelElementWithUnit = document.createElement(`div`);
    #zLabelElement = document.createElement(`span`);
    #zLabel = undefined
    constructor(prop) {
        super()
        this.displayValueElement = new UITable()
        this.displayUnitElement = new UIUnit({
            measurement : prop?.measurement,
            value: prop?.displayUnit ?? prop?.valueUnit
        })
        let oldUnit = this.displayUnit
        this.displayUnitElement.addEventListener(`change`, () => {
            if(this.displayValue != undefined)
                this.displayValue = ConvertValueFromUnitToUnit(this.displayValue, oldUnit, this.displayUnit)
            oldUnit = this.displayUnit
        })
        this.xDisplayUnitElement = new UIUnit({
            measurement : prop?.xMeasurement,
            value: prop?.xDisplayUnit ?? prop?.xUnit
        })
        let xOldUnit = this.xDisplayUnit
        this.xDisplayUnitElement.addEventListener(`change`, () => {
            if(this.xDisplayAxis != undefined && !window.EnumRegister?.isEnum(this.xUnit))
                this.xDisplayAxis = ConvertValueFromUnitToUnit(this.xDisplayAxis, xOldUnit, this.xDisplayUnit)
            xOldUnit = this.xDisplayUnit
        })
        this.yDisplayUnitElement = new UIUnit({
            measurement : prop?.yMeasurement,
            value: prop?.yDisplayUnit ?? prop?.yUnit
        })
        let yOldUnit = this.yDisplayUnit
        this.yDisplayUnitElement.addEventListener(`change`, () => {
            if(this.yDisplayAxis != undefined && !window.EnumRegister?.isEnum(this.yUnit))
                this.yDisplayAxis = ConvertValueFromUnitToUnit(this.yDisplayAxis, yOldUnit, this.yDisplayUnit)
            yOldUnit = this.yDisplayUnit
        })
        this.displayValueElement.addEventListener(`change`, () => {
            if(this.displayValue != undefined)
                this.value = ConvertValueFromUnitToUnit(this.displayValue, this.displayUnit, this.valueUnit)
            if(this.xDisplayAxis != undefined && !window.EnumRegister?.isEnum(this.xUnit))
                this.xAxis = ConvertValueFromUnitToUnit(this.xDisplayAxis, this.xDisplayUnit, this.xUnit)
            if(this.yDisplayAxis != undefined && !window.EnumRegister?.isEnum(this.yUnit))
                this.yAxis = ConvertValueFromUnitToUnit(this.yDisplayAxis, this.yDisplayUnit, this.yUnit)
        })
        this.#xLabelElementWithUnit.append(this.#xLabelElement)
        this.#xLabelElementWithUnit.append(this.xDisplayUnitElement)
        this.displayValueElement.xLabel = this. #xLabelElementWithUnit
        this.#yLabelElementWithUnit.append(this.#yLabelElement)
        this.#yLabelElementWithUnit.append(this.yDisplayUnitElement)
        this.displayValueElement.yLabel = this. #yLabelElementWithUnit
        this.#zLabelElementWithUnit.append(this.#zLabelElement)
        this.#zLabelElementWithUnit.append(this.displayUnitElement)
        this.displayValueElement.zLabel = this. #zLabelElementWithUnit
        window.EnumRegister?.addEventListener(`change`, () => {
            if(window.EnumRegister?.isEnum(this.xUnit)) {
                this.xAxis = window.EnumRegister.getEnum(this.xUnit)?.map(enumEntry => {
                    return enumEntry.value
                })
            }
            if(window.EnumRegister?.isEnum(this.yUnit)) {
                this.yAxis = window.EnumRegister.getEnum(this.yUnit)?.map(enumEntry => {
                    return enumEntry.value
                })
            }
        })
        if(prop) {
            const propValue = prop.value;
            delete prop.value;
            Object.assign(this, prop);
            this.value = propValue;
        }
        this.Setup(prop)
    }

    get saveValue() {
        return {
            ...this.displayValueElement.saveValue,
            value: this.value,
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            ...(this.displayUnitElement.saveValue != undefined) && { displayUnit: this.displayUnitElement.saveValue },
            ...(this.xDisplayUnitElement.saveValue != undefined) && { xDisplayUnit: this.xDisplayUnitElement.saveValue },
            ...(this.yDisplayUnitElement.saveValue != undefined) && { yDisplayUnit: this.yDisplayUnitElement.saveValue }
        }
    }
    set saveValue(saveValue){
        this.displayValueElement.saveValue = { ...saveValue, value: undefined, xAxis: undefined, yAxis: undefined }
        if(saveValue.displayUnit != undefined)
            this.displayUnitElement.saveValue = saveValue.displayUnit
        if(saveValue.xDisplayUnit != undefined)
            this.xDisplayUnitElement.saveValue = saveValue.xDisplayUnit
        if(saveValue.yDisplayUnit != undefined)
            this.yDisplayUnitElement.saveValue = saveValue.yDisplayUnit
        if(saveValue.xAxis != undefined)
            this.xAxis = saveValue.xAxis
        if(saveValue.yAxis != undefined)
            this.yAxis = saveValue.yAxis
        this.value = saveValue.value
    }

    UpdateDisplayValue() {
        const displayUnit = this.displayUnit
        const valueUnit = this.valueUnit
        if(this.value != undefined && this.value.length === this.displayValue.length)
            this.displayValue           = ConvertValueFromUnitToUnit(this.value, valueUnit, displayUnit)
        this.displayValueElement.min    = ConvertValueFromUnitToUnit(this.min, valueUnit, displayUnit)     ?? this.displayValueElement.min
        this.displayValueElement.max    = ConvertValueFromUnitToUnit(this.max, valueUnit, displayUnit)     ?? this.displayValueElement.max
        this.displayValueElement.step   = ConvertValueFromUnitToUnit(this.step, valueUnit, displayUnit)    ?? this.displayValueElement.step
        if(window.EnumRegister?.isEnum(this.xUnit)) {
            const e = window.EnumRegister.getEnum(this.xUnit)
            this.xDisplayAxis = this.xAxis.map(x => {
                return e.find(enumEntry => enumEntry.value === x)?.label ?? x
            })
        } else if(this.xAxis != undefined)
            this.xDisplayAxis           = ConvertValueFromUnitToUnit(this.xAxis, this.xUnit, this.xDisplayUnit)
        if(window.EnumRegister?.isEnum(this.yUnit)) {
            const e = window.EnumRegister.getEnum(this.yUnit)
            this.yDisplayAxis = this.yAxis.map(y => {
                return e.find(enumEntry => enumEntry.value === y)?.label ?? y
            })
        } else if(this.yAxis != undefined)
            this.yDisplayAxis           = ConvertValueFromUnitToUnit(this.yAxis, this.yUnit, this.yDisplayUnit)
    }
    attachToTable(table) {
        this.displayValueElement.attachToTable(table)
        table.attachToTable(this.displayValueElement)
    }
    trail(x, y, z) {
        this.displayValueElement.trail(x,y,z)
    }
}
customElements.define(`ui-tablewithunit`, UITableWithUnit, { extends: `span` })