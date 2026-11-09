import UIText from "../JavascriptUI/UIText"
import CalculationOrVariableSelection from "./CalculationOrVariableSelection"
import GenericConfigs from "./GenericConfigs"
import { defaultNoVariables } from "../VariableRegistry"

export default class GenericCalculation extends CalculationOrVariableSelection {
    name = new UIText({ class: `genericCalculationName pinselectname` })

    get nameEditable() { return !this.name.disabled }
    set nameEditable(nameEditable) { this.name.disabled = !nameEditable }

    constructor(prop) {
        prop = {
            calculations:   GenericConfigs,
            selectionFilter: defaultNoVariables,
            ...prop
        }
        const nameValue = prop.name ?? `Name`
        delete prop.name
        super()
        super.Setup(prop)
        this.labelElement.replaceWith(this.name)
        this.name.addEventListener(`change`, () =>{
            this.label = this.name.value
            this.name.parentElement.setAttribute('label', this.label)
            this.#refreshReference()
        })
        this.name.value = nameValue
    }

    #refreshReference = () => {
        let reference = { ...this.#baseReference, name: this.#baseReference != undefined? `${this.#baseReference.name}.${this.name.value}` : this.name.value }
        super.reference = reference
    }

    #baseReference = undefined
    get reference() { return super.reference }
    set reference(reference) {
        this.#baseReference = reference
        this.#refreshReference()
    }

    get saveValue() {
        const saveValue = super.saveValue
        return { ...saveValue, name: this.nameEditable? saveValue.name : undefined}
    }
    set saveValue(saveValue) {
        super.saveValue = { ...saveValue, name: this.nameEditable? saveValue.name : undefined}
    }
}
customElements.define(`top-generic-calculation`, GenericCalculation, { extends: `span` })