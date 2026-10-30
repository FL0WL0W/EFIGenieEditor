import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import UINumber from "../JavascriptUI/UINumber"
import UITemplate from "../JavascriptUI/UITemplate"
import GenericConfigs from "../Calculation/GenericConfigs"
import { observeCANDataLayout } from "./CANDataLayout"
import UIText from "../JavascriptUI/UIText"
export default class CAN_PackData extends UITemplate {
    static displayName = `CAN Pack`
    static outputTypes = [ `CANData` ]
    static inputTypes = [ ]
    static template = `<span class="can-pack-layout"><span class="can-pack-fields"><span class="can-pack-field-group"><div data-element="name"></div><span>Offset:</span><div data-element="bitLocation"></div><div data-element="bitLengthLabel"></div><div data-element="bitLength"></div></span><wbr><span class="can-pack-field-group"><div data-element="multiplierLabel"></div><div data-element="multiplier"></div><div data-element="adderLabel"></div><div data-element="adder"></div></span></span><wbr><span class="can-pack-selection"><span data-element="variable"></span></span></span>`

    name = new UIText({ class: `canPackDataName` })
    bitLocation = new UINumber({
        min: 0,
        max: 63,
        step: 1,
        value: 0,
        class: `canBitOffset`
    })
    bitLengthLabel = document.createElement(`span`)
    bitLength = new UINumber({
        min: 1,
        max: 64,
        step: 1,
        value: 1,
        class: `canBitLength`
    })
    multiplierLabel = document.createElement(`span`)
    multiplier = new UINumber({
        value: 1,
        class: `canMultiplier`
    })
    adderLabel = document.createElement(`span`)
    adder = new UINumber({
        value: 0,
        class: `canAdder`
    })
    variable = new CalculationOrVariableSelection({
        outputTypes: [ `bool|CANData` ],
        calculations: GenericConfigs,
        template: `<div data-element="selection"></div><div data-element="liveUpdate"></div><span data-element="calculationContent"></span>`
    })

    constructor(prop) {
        super()
        this.variable.style.display = `inline`
        this.bitLengthLabel.innerText = `Length:`
        this.multiplierLabel.innerText = `Multiplier:`
        this.adderLabel.innerText = `Adder:`
        this.multiplier.hidden = this.multiplierLabel.hidden = this.adder.hidden = this.adderLabel.hidden = true
        this.bitLocation.addEventListener(`change`, () => {
            this.bitLength.max = 64-this.bitLocation.value
        })
        this.bitLength.addEventListener(`change`, () => {
            const hasBitLength = this.variable.SubConfig?.constructor?.bitLength
            this.multiplier.hidden = this.multiplierLabel.hidden = this.adder.hidden = this.adderLabel.hidden = this.bitLength.value < 2 || hasBitLength
            this.variable.outputTypes = [ this.bitLength.value < 2? `bool|CANData` : `float|CANData` ]
        })
        this.variable.addEventListener(`change`, () => {
            const hasBitLength = this.variable.SubConfig?.constructor?.bitLength
            this.multiplier.hidden = this.multiplierLabel.hidden = this.adder.hidden = this.adderLabel.hidden = this.bitLength.value < 2 || hasBitLength
            this.bitLength.hidden = this.bitLengthLabel.hidden = hasBitLength
            if(hasBitLength) {
                this.bitLength.value = this.variable.SubConfig.constructor.bitLength
            }
        })
        this.Setup(prop)
    }

    #stopObservingLayout
    connectedCallback() {
        this.#stopObservingLayout?.()
        this.#stopObservingLayout = observeCANDataLayout(this)
    }

    disconnectedCallback() {
        this.#stopObservingLayout?.()
        this.#stopObservingLayout = undefined
    }

    RegisterVariables(reference) {
        reference = { ...reference, name: `${reference.name}.${this.name.value}` }
        this.variable.RegisterVariables(reference)
    }
}
customElements.define(`can-pack-data`, CAN_PackData, { extends: `span` })
