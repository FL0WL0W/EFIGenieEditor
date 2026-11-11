import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import UINumber from "../JavascriptUI/UINumber"
import UITemplate from "../JavascriptUI/UITemplate"
import GenericConfigs from "../Calculation/GenericConfigs"
import { observeCANDataLayout } from "./CANDataLayout"
import UIText from "../JavascriptUI/UIText"
import CANPackDataConfigs from "./CANPackDataConfigs"
import { objectTester } from "../JavascriptUI/UIUtils"
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
        calculations: [ ...GenericConfigs, ...CANPackDataConfigs ],
        template: `<div data-element="selection"></div><div data-element="liveUpdate"></div><span data-element="calculationContent"></span>`
    })

    constructor(prop) {
        super()
        this.variable.style.display = `inline`
        this.bitLengthLabel.innerText = `Length:`
        this.multiplierLabel.innerText = `Multiplier:`
        this.adderLabel.innerText = `Adder:`
        this.multiplier.disabled = this.multiplierLabel.disabled = this.adder.disabled = this.adderLabel.disabled = true
        Object.defineProperty(this.multiplierLabel, 'disabled', {
            get: function() { return this.classList.contains(`disabled`) },
            set: function(disabled) { if(disabled == this.disabled) return; if(disabled) this.classList.add(`disabled`); else this.classList.remove(`disabled`) }
        })
        Object.defineProperty(this.adderLabel, 'disabled', {
            get: function() { return this.classList.contains(`disabled`) },
            set: function(disabled) { if(disabled == this.disabled) return; if(disabled) this.classList.add(`disabled`); else this.classList.remove(`disabled`) }
        })
        this.bitLocation.addEventListener(`change`, () => {
            this.bitLength.max = 64-this.bitLocation.value
        })
        this.bitLength.addEventListener(`change`, () => {
            const hasBitLength = this.variable.SubConfig?.constructor?.bitLength
            this.multiplier.disabled = this.multiplierLabel.disabled = this.adder.disabled = this.adderLabel.disabled = this.bitLength.value < 2 || hasBitLength
            if(this.multiplier.disabled) this.multiplier.value = 1
            if(this.adder.disabled) this.adder.value = 0
            this.variable.outputTypes = [ this.bitLength.value < 2? `bool|CANData` : `float|CANData` ]
        })
        this.variable.addEventListener(`change`, () => {
            const hasBitLength = this.variable.SubConfig?.constructor?.bitLength
            this.multiplier.disabled = this.multiplierLabel.disabled = this.adder.disabled = this.adderLabel.disabled = this.bitLength.value < 2 || hasBitLength
            if(this.multiplier.disabled) this.multiplier.value = 1
            if(this.adder.disabled) this.adder.value = 0
            this.bitLength.disabled = this.bitLengthLabel.disabled = hasBitLength
            if(hasBitLength) {
                this.bitLength.value = this.variable.SubConfig.constructor.bitLength
            }
        })
        this.name.addEventListener(`change`, this.#refreshReference)
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

    #refreshReference = () => {
        let reference = { ...this.#baseReference, name: this.#baseReference != undefined? `${this.#baseReference.name}.${this.name.value}` : this.name.value }
        this.variable.reference = this.#reference = reference
    }

    #baseReference = undefined
    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        if(objectTester(reference, this.#baseReference)) return
        this.#baseReference = reference
        this.#refreshReference()
    }
}
customElements.define(`can-pack-data`, CAN_PackData, { extends: `span` })
