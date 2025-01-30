import Input_AnalogPolynomial from "../Input/Input_AnalogPolynomial"
import UINumberWithUnit from "../UI/UINumberWithUnit"
import MAPConfigs from "./MAPConfigs"
export default class MAP_Linear extends Input_AnalogPolynomial {
    static displayName = `Linear MAP`
    static outputUnits = [ `Bar` ]
    static template =   `${Input_AnalogPolynomial.template}<div><label>Offset:</label><div data-element="offset"></div></div><div><label>Linear:</label><div data-element="linear"></div>per 5V</div>`
    offset = new UINumberWithUnit({
        value:          0.0062,
        step:           0.01,
        measurement:    `Pressure`,
        valueUnit:      `Bar`,
        displayUnit:    `kPa`
    })
    linear = new UINumberWithUnit({
        value:          3.0925,
        step:           0.01,
        min:            0,
        measurement:    `Pressure`,
        valueUnit:      `Bar`,
        displayUnit:    `kPa`
    })
    get saveValue() { 
        let saveValue = super.saveValue
        delete saveValue.polynomial
        return saveValue
    }
    set saveValue(saveValue) { super.saveValue = saveValue }

    constructor(prop) {
        super()
        this.polynomial.hidden = true
        this.updatePolynomial()
        this.polynomial.addEventListener(`change`, () => {
            this.updatePolynomial()
        })
        this.offset.addEventListener(`change`, () => {
            this.updatePolynomial()
        })
        this.linear.addEventListener(`change`, () => {
            this.updatePolynomial()
        })
        this.Setup(prop)
        this.outputUnits = this.constructor.outputUnits
    }

    updatePolynomial() {
        const offset = this.offset.value
        const linear = this.linear.value
        let coeffecients = []
        coeffecients[1] = linear / 5;
        coeffecients[0] = offset;
        this.polynomial.minValue = offset
        this.polynomial.maxValue = linear + offset;
        this.polynomial.coeffecients = coeffecients
    }
}
MAPConfigs.push(MAP_Linear)
customElements.define(`map-linear`, MAP_Linear, { extends: `span` })