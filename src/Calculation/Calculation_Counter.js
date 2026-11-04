import UITemplate from "../JavascriptUI/UITemplate"
import UICheckBox from "../JavascriptUI/UICheckBox"
import GenericConfigs from "./GenericConfigs"
export default class Calculation_Counter extends UITemplate {
    static displayName = `Counter`
    static outputTypes = [ `float` ]
    static template = ``

    get value() { return true; } //have to return something for variable so buildConfig will generate in CalculationOrVariableSelection
    set value(value) { }
}
GenericConfigs.push(Calculation_Counter)
customElements.define(`calculation-counter`, Calculation_Counter, { extends: `span` })
