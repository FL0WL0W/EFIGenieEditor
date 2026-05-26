import Output_Digital from "./Output_Digital"
import GenericOutputConfigs from "./GenericOutputConfigs"
import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import GenericConfigs from "../Calculation/GenericConfigs"
export default class GenericOutput_Digital extends Output_Digital {
    static displayName = `Digital Pin`
    static inputTypes = [ ]
    static template =   `${Output_Digital.template}<div data-element="output"></div>`

    output = new CalculationOrVariableSelection({
        label:          `Output`,
        outputTypes:    [ `bool` ],
        calculations: GenericConfigs
    })
    
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }
}
GenericOutputConfigs.push(GenericOutput_Digital)
customElements.define(`generic-output-digital`, GenericOutput_Digital, { extends: `span` })