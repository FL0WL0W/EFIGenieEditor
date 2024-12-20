import Input_AnalogPolynomial from "../Input/Input_AnalogPolynomial"
import MAPConfigs from "./MAPConfigs"
export default class MAP_GM2Bar extends Input_AnalogPolynomial {
    static displayName = `GM 2 Bar MAP`
    static outputUnits = [ `Bar` ]

    get saveValue() { return this.analogInput.saveValue }
    set saveValue(saveValue) { return this.analogInput.saveValue = saveValue }

    constructor(prop) {
        super(prop)
        this.outputUnits = this.constructor.outputUnits
        this.polynomial.hidden = true
        this.polynomial.minValue = 0.088
        this.polynomial.maxValue = 2.08
        let coeffecients = []
        coeffecients[0] = 0.082718614718615
        coeffecients[1] = 0.398493506493506
        this.polynomial.coeffecients = coeffecients
    }
}
MAPConfigs.push(MAP_GM2Bar)
customElements.define(`map-gm2bar`, MAP_GM2Bar, { extends: `span` })