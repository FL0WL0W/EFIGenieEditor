import UINumber from "../JavascriptUI/UINumber"
import UITemplate from "../JavascriptUI/UITemplate"
import UIText from "../JavascriptUI/UIText"
import UIDisplayLiveUpdate from "../UI/UIDisplayLiveUpdate"
import UIUnit from "../UI/UIUnit"
import { objectTester } from "../JavascriptUI/UIUtils"

import { observeCANDataLayout } from "./CANDataLayout"

export default class CAN_ParseData extends UITemplate {
    static displayName = `CAN Parse`
    static outputTypes = [ `bool|float|enum` ]
    static inputTypes = [ `CANData` ]
    static template = `<span class="can-parse-layout"><span class="can-parse-content"><span class="can-parse-label"><div data-element="name"></div><span class="can-parse-colon">:&nbsp;</span></span><span class="can-parse-fields"><span class="can-parse-field-group"><span>Offset:</span><div data-element="bitLocation"></div><span>Length:</span><div data-element="bitLength"></div></span><wbr><span class="can-parse-field-group"><div data-element="multiplierLabel"></div><div data-element="multiplier"></div><div data-element="adderLabel"></div><div data-element="adder"></div></span></span><span class="can-parse-unit"><div data-element="unit"></div></span><span class="can-parse-live"><div data-element="liveUpdate"></div></span></span></span>`

    name = new UIText({ class: `canParseDataName` })
    bitLocation = new UINumber({
        min: 0,
        max: 63,
        step: 1,
        value: 0,
        class: `canBitOffset`
    })
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
    unit = new UIUnit()
    liveUpdate = new UIDisplayLiveUpdate()

    constructor(prop) {
        super()
        this.multiplierLabel.innerText = `Multiplier:`
        this.adderLabel.innerText = `Adder:`
        Object.defineProperty(this.multiplierLabel, 'disabled', {
            get: function() { return this.classList.contains(`disabled`) },
            set: function(disabled) { if(disabled == this.disabled) return; if(disabled) this.classList.add(`disabled`); else this.classList.remove(`disabled`) }
        })
        Object.defineProperty(this.adderLabel, 'disabled', {
            get: function() { return this.classList.contains(`disabled`) },
            set: function(disabled) { if(disabled == this.disabled) return; if(disabled) this.classList.add(`disabled`); else this.classList.remove(`disabled`) }
        })
        this.multiplier.disabled = this.multiplierLabel.disabled = this.adder.disabled = this.adderLabel.disabled = this.unit.hidden = true
        this.liveUpdate.style.float = `right`
        this.bitLocation.addEventListener(`change`, () => {
            this.bitLength.max = 64-this.bitLocation.value
        })
        this.bitLength.addEventListener(`change`, () => {
            const isEnum = EnumRegister?.isEnum(this.unit.value)
            this.unit.hidden = this.bitLength.value < 2
            this.multiplier.disabled = this.multiplierLabel.disabled = this.adder.disabled = this.adderLabel.disabled = this.bitLength.value < 2 || isEnum
            if(this.multiplier.disabled) this.multiplier.value = 1
            if(this.adder.disabled) this.adder.value = 0
            this.#refreshReference()
        })
        this.unit.addEventListener(`change`, () => {
            const isEnum = EnumRegister?.isEnum(this.unit.value)
            // Multiplier/adder are meaningless for enum types
            if(this.bitLength.value >= 2)
                this.multiplier.disabled = this.multiplierLabel.disabled = this.adder.disabled = this.adderLabel.disabled = isEnum
            if(this.multiplier.disabled) this.multiplier.value = 1
            if(this.adder.disabled) this.adder.value = 0
            // valueUnit only applies to scalar (non-enum) units
            this.liveUpdate.valueUnit = (this.bitLength.value < 2 || isEnum) ? undefined : this.unit.value
            this.#refreshReference()
        })
        this.name.addEventListener(`change`, this.#refreshReference)
        this.Setup(prop)
    }

    #refreshReference = () => {
        let reference = { ...this.#baseReference, name: this.#baseReference != undefined? `${this.#baseReference.name}.${this.name.value}` : this.name.value }

        const selectedUnit = this.unit.value
        if(EnumRegister?.isEnum(selectedUnit) && this.bitLength.value > 1) {
            // Enum type: enum name stored as unit, type is the literal string 'enum'.
            reference.unit = selectedUnit
            reference.type = `enum`
        } else {
            reference.unit = selectedUnit ?? reference.unit
            if(reference.unit && this.bitLength.value > 1) {
                if(reference.type !== `enum`)
                    delete reference.type
            } else {
                delete reference.unit
                reference.type = this.bitLength.value < 2? `bool` : `float`
            }
        }
        
        if(objectTester(this.reference, reference)) return
        const previousReference = this.reference
        this.liveUpdate.reference = this.#reference = reference
        if(!this.isConnected) return
        VariableRegister.RegisterVariable(reference, previousReference)
    }

    #baseReference = undefined
    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        this.#baseReference = reference
        this.#refreshReference()
    }

    #stopObservingLayout
    connectedCallback() {
        this.#stopObservingLayout?.()
        this.#stopObservingLayout = observeCANDataLayout(this)
        VariableRegister.RegisterVariable(this.reference)
    }

    disconnectedCallback() {
        this.#stopObservingLayout?.()
        this.#stopObservingLayout = undefined
        VariableRegister.UnRegisterVariable(this.reference)
    }
}
customElements.define(`can-parse-data`, CAN_ParseData, { extends: `span` })
