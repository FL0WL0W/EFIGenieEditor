import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import UINumber from "../JavascriptUI/UINumber"
import BooleanOutputConfigs from "./BooleanOutputConfigs"
export default class Output_TDC extends CalculationOrVariableSelection {
    static inputTypes = [ `bool` ]

    constructor(prop) {
        super()
        this.inputTypes = [ `bool` ]
        this.required = true
        this.calculations = BooleanOutputConfigs
        this.Setup(prop)
        this.selection.addEventListener(`change`, () => {
            if(this.options.map(option => option.options?.length ?? 1).reduce((partionSum, a) => partionSum + a, 0) < 2 && this.SubConfig?.querySelectorAll("label").length < 2) {
                this.selection.hidden = true
                if(this.subConfigLabel === undefined) {
                    this.subConfigLabel = this.SubConfig.firstChild
                    this.SubConfig.firstChild.remove()
                    this.SubConfig.style.display = ``
                }
            } else if(this.subConfigLabel !== undefined && this.SubConfig !== undefined) {
                this.SubConfig.insertBefore(this.subConfigLabel, this.SubConfig.firstChild)
                this.SubConfig.style.display = `block`
            }
        })
        this.selection.dispatchEvent(new Event(`change`, {bubbles: true}))
    }

    Setup(prop) {
        this.TDC = new UINumber({
            value:  0,
            step:   1,
            min:    0,
            max:    720,
            class: `tdc`
        })
        let span = document.createElement(`span`)
        span.append(`\xa0\xa0\xa0\xa0\xa0\xa0TDC:`)
        span.append(this.TDC)
        span.append(`°`)
        super.Setup(prop)
        this.labelElement.parentElement.append(span)
        this.labelElement.class = `pinselectname`
    }
}
customElements.define(`output-tdc`, Output_TDC, { extends: `span` })