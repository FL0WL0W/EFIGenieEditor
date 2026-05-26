import Output_PWM from "./Output_PWM"
import GenericOutputConfigs from "./GenericOutputConfigs"
import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import GenericConfigs from "../Calculation/GenericConfigs"
export default class GenericOutput_PWM extends Output_PWM {
    static displayName = `PWM Pin`
    static inputTypes = [ ]
    static template =   `${Output_PWM.template}<div data-element="period"></div><div data-element="pulseWidth"></div>`

    period = new CalculationOrVariableSelection({
        label:          `Period`,
        outputUnits:    [ `s` ],
        displayUnits:   [ `ms` ],
        calculations: GenericConfigs
    })
    pulseWidth = new CalculationOrVariableSelection({
        label:          `PulseWidth`,
        outputUnits:    [ `s` ],
        displayUnits:   [ `ms` ],
        calculations: GenericConfigs
    })
    
    constructor(prop){
        super()
        this.style.display = `block`
        this.Setup(prop)
    }
}
GenericOutputConfigs.push(GenericOutput_PWM)
customElements.define(`generic-output-pwm`, GenericOutput_PWM, { extends: `span` })