import UINumberWithUnit from "./UINumberWithUnit"
import { ConvertValueFromUnitToUnit } from "./UIUnit"
export default class UIDisplayNumberWithUnit extends UINumberWithUnit {
    static template = `<div data-element="displayElement"></div><div data-element="displayUnitElement"></div>`

    ZeroesToAdd = 10000000
    displayElement = document.createElement(`div`)

    constructor(prop) {
        super()
        this.displayUnitElement.addEventListener(`change`, () => {
            this.ZeroesToAdd = 10000000
            this.UpdateDisplayValue()
        })
        this.displayElement.style.display = this.displayUnitElement.style.display = `inline-block`
        this.ZeroesToAdd = 10000000
        this.Setup(prop)
    }

    get saveValue() { return this.displayUnitElement.saveValue }
    set saveValue(saveValue) { this.displayUnitElement.saveValue = saveValue }

    #value
    get value() { return this.#value }
    set value(value) {
        if(this.#value === value)
            return
        this.#value = value
        if(typeof value === `boolean`)
        {
            this.displayUnitElement.hidden = true
            if(value)
                this.displayElement.textContent = `true`
            else
                this.displayElement.textContent = `false`
            return;
        }
        const displayUnit = this.displayUnit
        const valueUnit = this.valueUnit
        const valueToDisplayValue = value => { return value == undefined || !displayUnit? value : ConvertValueFromUnitToUnit(value, valueUnit, displayUnit) }
        let displayValue = valueToDisplayValue(value)
        if(displayValue == undefined) return
            
        displayValue = `${parseFloat(parseFloat(parseFloat(displayValue).toFixed(5)).toPrecision(6))}`
        const indexOfPoint = displayValue.indexOf(`.`)
        let zeroesToAdd = Math.max(0, 6-(displayValue.length - indexOfPoint))
        if(indexOfPoint === -1) zeroesToAdd = 6
        if(zeroesToAdd < this.ZeroesToAdd) this.ZeroesToAdd = zeroesToAdd
        zeroesToAdd -= this.ZeroesToAdd
        if(zeroesToAdd > 0 && indexOfPoint < 0) displayValue += `.`
        for(let i = 0; i < zeroesToAdd; i++) displayValue += `0`

        this.displayElement.textContent = displayValue
    }
}
customElements.define(`ui-displaynumberwithunit`, UIDisplayNumberWithUnit, { extends: `span` })