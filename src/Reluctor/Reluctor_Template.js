import Input_DigitalRecord from "../Input/Input_DigitalRecord"
import { objectTester } from "../JavascriptUI/UIUtils"
export default class Reluctor_Template extends Input_DigitalRecord {
    static outputTypes = [ `ReluctorResult` ]
    static template = Input_DigitalRecord.template.substring(0, Input_DigitalRecord.template.lastIndexOf(`Inverted`) + 8)
    
    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        reference = { ...reference, type: `Record` }
        delete reference.unit
        delete reference.id
        if(objectTester(this.reference, reference)) return
        const previousReference = this.reference
        this.#reference = reference
        if(!this.isConnected) return
        VariableRegister.RegisterVariable(reference, previousReference)
    }

    connectedCallback() {
        VariableRegister.RegisterVariable(this.reference)
    }

    disconnectedCallback() {
        VariableRegister.UnRegisterVariable(this.reference)
    }
}
customElements.define(`reluctor-template`, Reluctor_Template, { extends: `span` })