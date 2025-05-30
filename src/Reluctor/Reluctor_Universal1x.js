import Reluctor_Template from "./Reluctor_Template"
import UINumberWithUnit from "../UI/UINumberWithUnit"
import UISelection from "../JavascriptUI/UISelection"
import ReluctorConfigs from "./ReluctorConfigs"
export default class Reluctor_Universal1x extends Reluctor_Template {
    static displayName = `Reluctor Universal 1X`
    static template =   Reluctor_Template.template +
                        `<br/><label>Capture On:</label><div data-element="mode"></div>` +
                        `<span data-element="rising"><br/><label>Rising Edge Position:</label><div data-element="risingPosition"></div></span>` +
                        `<span data-element="falling"><br/><label>Falling Edge Position:</label><div data-element="fallingPosition"></div></span>`

    mode = new UISelection({
        options: [
            { name: `Both Edges`, value: 0 },
            { name: `Rising Edge`, value: 1 },
            { name: `Falling Edge`, value: 2 }
        ],
        value: 0,
        selectHidden: true
    })
    risingPosition = new UINumberWithUnit({
        value:          0,
        step:           0.1,
        min:            0,
        max:            360,
        measurement:    `Angle`,
        valueUnit:      `°`
    })
    fallingPosition = new UINumberWithUnit({
        value:          180,
        step:           0.1,
        min:            0,
        max:            360,
        measurement:    `Angle`,
        valueUnit:      `°`
    })
    constructor(prop){
        super()
        this.mode.addEventListener(`change`, e=> {
            this.querySelectorAll(`[data-element="rising"]`)[0].hidden = !(this.mode.value === 0 || this.mode.value === 1)
            this.querySelectorAll(`[data-element="falling"]`)[0].hidden = !(this.mode.value === 0 || this.mode.value === 2)
        })
        this.Setup(prop)
        this.length.value = 8
    }
}
ReluctorConfigs.push(Reluctor_Universal1x)
customElements.define(`reluctor-universal1x`, Reluctor_Universal1x, { extends: `span` })