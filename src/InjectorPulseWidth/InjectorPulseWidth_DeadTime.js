import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import GenericConfigs from "../Calculation/GenericConfigs"
import UITemplate from "../JavascriptUI/UITemplate"
import UINumberWithUnit from "../UI/UINumberWithUnit"
import InjectorPulseWidthConfigs from "./InjectorPulseWidthConfigs"

export default class InjectorPulseWidth_DeadTime extends UITemplate {
    static displayName = `Dead Time`
    static outputUnits = [ `s` ]
    static template =   `<div data-element="FlowRate"></div>` +
                        `<div data-element="DeadTime"></div>` +
                        `<label>Min Injector Fuel Mass:</label><div data-element="MinInjectorFuelMass"></div>`

    FlowRate = new CalculationOrVariableSelection({
        calculations:   GenericConfigs,
        label:          `Injector Flow Rate`,
        outputUnits:    [ `g/s` ],
    })
    DeadTime = new CalculationOrVariableSelection({
        calculations:   GenericConfigs,
        label:          `Injector Dead Time`,
        outputUnits:    [ `s` ],
        displayUnits:   [ `ms` ]
    })
    MinInjectorFuelMass = new UINumberWithUnit({
        value:          0.005,
        step:           0.001,
        measurement:    `Mass`,
        valueUnit:      `g`,
        displayUnit:    `mg`
    })
    constructor(prop) {
        super()
        this.style.display = `block`
        this.Setup(prop)
    }

    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        this.#reference = reference
        this.DeadTime.reference = { ...reference, name: reference?.name? `${reference.name}.Injector Dead Time` : `Injector Dead Time` }
        this.FlowRate.reference = { ...reference, name: reference?.name? `${reference.name}.Injector Flow Rate` : `Injector Flow Rate` }
    }
}
InjectorPulseWidthConfigs.push(InjectorPulseWidth_DeadTime)
customElements.define(`injectorpulsewidth-deadtime`, InjectorPulseWidth_DeadTime, { extends: `span` })
