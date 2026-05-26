import Input_DigitalRecord from "../Input/Input_DigitalRecord"
import { objectTester } from "../JavascriptUI/UIUtils"
export default class Reluctor_Template extends Input_DigitalRecord {
    static outputTypes = [ `ReluctorResult` ]
    static template = Input_DigitalRecord.template.substring(0, Input_DigitalRecord.template.lastIndexOf(`Inverted`) + 8)

    #currentReference = undefined
    disconnectedCallback() {
        VariableRegister.UnRegisterVariable(this.#currentReference)
        this.#currentReference = undefined
    }

    RegisterVariables(reference) {
        reference = { ...reference }
        delete reference.unit
        delete reference.id
        reference.type = `Record`
        if(!objectTester(this.#currentReference, reference)) {
            VariableRegister.UnRegisterVariable(this.#currentReference)
            VariableRegister.RegisterVariable(reference)
            this.#currentReference = reference
        }
    }
}
customElements.define(`reluctor-template`, Reluctor_Template, { extends: `span` })