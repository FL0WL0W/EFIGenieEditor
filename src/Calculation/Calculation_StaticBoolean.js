import UITemplate from "../JavascriptUI/UITemplate"
import UICheckBox from "../JavascriptUI/UICheckBox"
import GenericConfigs from "./GenericConfigs"
export default class Calculation_StaticBoolean extends UITemplate {
    static displayName = `Static Boolean`
    static outputTypes = [ `bool` ]
    static template = `<div data-element="booleanElement"></div>`

    constructor(prop) {
        super()
        this.booleanElement = new UICheckBox()
        this.Setup(prop)
    }
    set class(pclass) { this.booleanElement.class = pclass }
    get value() { return this.booleanElement.value }
    set value(value) { this.booleanElement.value = value }
    get saveValue() { return this.booleanElement.saveValue }
    set saveValue(saveValue) { this.booleanElement.saveValue = saveValue }
}
GenericConfigs.push(Calculation_StaticBoolean)
customElements.define(`calculation-staticboolean`, Calculation_StaticBoolean, { extends: `span` })
