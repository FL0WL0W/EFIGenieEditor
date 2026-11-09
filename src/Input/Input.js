import UITemplate from "../JavascriptUI/UITemplate"
import UIText from "../JavascriptUI/UIText"
import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import { GetMeasurementNameFromUnitName } from "../UI/UIUnit"
import InputConfigs from "./InputConfigs"
import { defaultNoVariables } from "../VariableRegistry"
export default class Input extends UITemplate {
    static template = `<div style="float: right;"></div><div data-element="translationConfig"></div><div data-element="hr"></div><div data-element="rawConfigContainer"></div>`

    get outputTypes() { return this.translationConfig.outputTypes }
    set outputTypes(outputTypes) { this.translationConfig.outputTypes = outputTypes }
    get outputUnits() { return this.translationConfig.outputUnits }
    set outputUnits(outputUnits) { this.translationConfig.outputUnits = outputUnits }

    hr = document.createElement(`hr`)
    name = new UIText({ class: `pinselectname inputName` })
    translationConfig = new CalculationOrVariableSelection({
        calculations:           InputConfigs,
        selectionFilter:        function() {
            return function(calcOrVar) {
                if(calcOrVar.type || calcOrVar.unit) 
                    return false
                return true
            }
        },
        noParameterSelection:   true
    })
    rawConfigContainer = document.createElement(`div`)
    rawConfig = new CalculationOrVariableSelection({
        calculations:           InputConfigs,
        selectionFilter:        defaultNoVariables,
        label:                  `Source`,
        inputTypes:             [],
        noParameterSelection:   true
    })
    constructor(prop) {
        super()
        this.style.display = `block`
        this.name.addEventListener(`change`, () =>{
            this.translationConfig.label = this.name.value
            this.#refreshReference()
        })
        this.translationConfig.addEventListener(`change`, () => {
            if((this.translationConfig.inputUnits?.length ?? this.translationConfig.inputTypes?.length ?? 0) === 0) {
                this.hr.hidden = true
                this.rawConfigContainer.innerHTML = ``
                this.rawConfig.selection.value = undefined
            } else {
                this.hr.hidden = false
                this.rawConfigContainer.replaceChildren(this.rawConfig)
            }
        })
        this.translationConfig.labelElement.replaceWith(this.name)
        this.rawConfig.addEventListener(`change`, () => {
            if(this.rawConfig.outputUnits?.[0]) {
                this.translationConfig.inputUnits = this.rawConfig.outputUnits
                this.translationConfig.xLabel = GetMeasurementNameFromUnitName(this.rawConfig.outputUnits?.[0])
            }
        })
        this.hr.hidden = true
        this.hr.style.margin = `2px`
        prop ??= { }
        this.name.value = prop.name ?? `Name`
        delete prop.name
        this.Setup(prop)
    }

    #refreshReference = () => {
        const reference = this.#reference = { ...this.#baseReference, name: this.#baseReference != undefined? `${this.#baseReference.name}.${this.name.value}` : this.name.value }
        this.translationConfig.reference = reference
        this.rawConfig.reference = reference
    }

    #baseReference = undefined
    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        this.#baseReference = reference
        this.#refreshReference()
    }
}
customElements.define('config-input', Input, { extends: `span` })