import Top from "./Top";
import Dashboard from "./Dashboard";
import UIPinOverlay from "../UI/UIPinOverlay"
import UISelection from "../JavascriptUI/UISelection";
import Pinouts from "../Pinouts/Pinouts";
import ConfigList from "./ConfigList";
import Engine from "./Engine";
import Fuel from "./Fuel";
import Ignition from "./Ignition";
import Input from "../Input/Input";
import CANConfigs from "../CAN/CANConfigs";
import GenericCalculation from "../Calculation/GenericCalculation";
import GenericConfigs from "../Calculation/GenericConfigs";
import { objectTester } from "../JavascriptUI/UIUtils";

export default class TopEngine extends Top {
    Dashboard = new Dashboard()
    PinOverlay = new UIPinOverlay()
    TargetDevice = new UISelection({
        options: Object.entries(Pinouts).map(([key, value]) => { return { name: value.name, value: key } })
    })
    Inputs = new ConfigList({
        itemConstructor: Input,
        saveValue: [{}],
        reference: { name: `Inputs` }
    })
    CAN = new ConfigList({
        newItem() {
            return new GenericCalculation({
                calculations: [ {group: `CAN`, calculations: CANConfigs}, {group: `Generic`, calculations: GenericConfigs} ],
                class: `can-message-item`,
                template: `<span class="can-message-layout">${GenericCalculation.template}</span>`
            })
        },
        reference: { name: `CANParameters` },
    })
    Engine = new Engine({ reference: { name: `EngineParameters` } })
    Fuel = new Fuel({ reference: { name: `FuelParameters` } })
    Ignition = new Ignition({ reference: { name: `IgnitionParameters` } })

    constructor(prop) {
        super()
        this.addTab(this.Dashboard, `Dashboard`)
        this.addTab(this.PinOverlay, `Pin Mapping`)
        this.addTab(this.Inputs, `Inputs`)
        this.addTab(this.CAN, `CAN`)
        this.addTab(this.Engine, `Engine`)
        this.addTab(this.Fuel, `Fuel`)
        this.addTab(this.Ignition, `Ignition`)
        this.TargetDevice.addEventListener(`change`, () => { 
            this.PinOverlay.pinOut = Pinouts[this.TargetDevice.value]
            if(this.PinOverlay.pinOut.CANBusCount) {
                this.unhideTab(`CAN`)
                this.CAN.hidden = false
            } else {
                this.hideTab(`CAN`)
                this.CAN.hidden = true
            }
        })
        this.PinOverlay.pinOut = Pinouts[this.TargetDevice.value]
        if(this.PinOverlay.pinOut?.CANBusCount)
            this.unhideTab(`CAN`)
        else
            this.hideTab(`CAN`)
        this.Setup(prop)
    }

    get value() { return { ...super.value, CANAvailable: (this.PinOverlay.pinOut.CANBusCount ?? 0) > 1 } }
    set value(value) { super.value = value }

    static currentTickReference = { name: `CurrentTick`, type: `tick` }
    disconnectedCallback() {
        VariableRegister.UnRegisterVariable(TopEngine.currentTickReference)
    }
    connectedCallback() {
        VariableRegister.RegisterVariable(TopEngine.currentTickReference)
    }
}
customElements.define(`top-topengine`, TopEngine, { extends: `span` })
