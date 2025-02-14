import Input_DigitalRecord from "../Input/Input_DigitalRecord"
export default class Reluctor_Template extends Input_DigitalRecord {
    static outputTypes = [ `ReluctorResult` ]
    static template = Input_DigitalRecord.template.substring(0, Input_DigitalRecord.template.lastIndexOf(`Inverted`) + 8)

    RegisterVariables(reference) {
        reference = { ...reference }
        delete reference.unit
        delete reference.id
        reference.type = `Record`
        VariableRegister.RegisterVariable(reference)
    }
}
customElements.define(`reluctor-template`, Reluctor_Template, { extends: `span` })