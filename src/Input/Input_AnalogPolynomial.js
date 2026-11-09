import UITemplate from "../JavascriptUI/UITemplate"
import Input_Analog from "./Input_Analog"
import Calculation_Polynomial from "../Calculation/Calculation_Polynomial"
import UIDisplayLiveUpdate from "../UI/UIDisplayLiveUpdate"
import { objectTester } from "../JavascriptUI/UIUtils"
export default class Input_AnalogPolynomial extends UITemplate {
    static outputTypes = [ `float` ]
    static template = `<div data-element="voltageLiveUpdate"></div><div data-element="analogInput"></div><div data-element="polynomial"></div>`

    get displayUnit() { return this.polynomial.displayUnit }
    set displayUnit(displayUnit) { this.polynomial.displayUnit = displayUnit }
    get measurement() { return this.polynomial.measurement }
    set measurement(measurement) { this.polynomial.measurement = measurement }
    get valueUnit() { return this.polynomial.valueUnit }
    set valueUnit(valueUnit) { this.polynomial.valueUnit = valueUnit }
    get outputUnits() { return this.polynomial.outputUnits }
    set outputUnits(outputUnits) { this.polynomial.outputUnits = outputUnits }
    get displayUnits() { return this.polynomial.displayUnits }
    set displayUnits(displayUnits) { this.polynomial.displayUnits = displayUnits }

    analogInput = new Input_Analog()
    polynomial = new Calculation_Polynomial()
    voltageLiveUpdate = new UIDisplayLiveUpdate({ valueUnit: Input_Analog.outputUnits[0] })
    constructor(prop){
        super()
        this.voltageLiveUpdate.style.float = `right`
        this.Setup(prop)
        this.style.display = `block`
    }

    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        reference = { ...reference, unit: `V` }
        delete reference.type
        delete reference.id
        if(objectTester(this.reference, reference)) return
        const previousReference = this.reference
        this.voltageLiveUpdate.reference = this.#reference = reference
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
customElements.define(`input-analogpolynomial`, Input_AnalogPolynomial, { extends: `span` })