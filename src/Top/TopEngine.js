import Top from "./Top";
import Dashboard from "./Dashboard";
import UIPinOverlay from "../UI/UIPinOverlay"
import UISelection from "../JavascriptUI/UISelection";
import Pinouts from "../Pinouts/Pinouts";
import Engine from "./Engine";
import Fuel from "./Fuel";
import Ignition from "./Ignition";
import Input from "../Input/Input";
import CANConfigs from "../CAN/CANConfigs";
import GenericCalculation from "../Calculation/GenericCalculation";
import GenericConfigs from "../Calculation/GenericConfigs";

export default class TopEngine extends Top {
    Dashboard = new Dashboard()
    PinOverlay = new UIPinOverlay()
    TargetDevice = new UISelection({
        options: Object.entries(Pinouts).map(([key, value]) => { return { name: value.name, value: key } }),
        value: `ESP32C6_Expander`
    })
    Inputs = new ConfigList({
        itemConstructor: Input,
        saveValue: [{}]
    })
    CAN = new ConfigList({
        newItem() { return new GenericCalculation({ calculations: [ {group: `CAN`, calculations: CANConfigs}, {group: `Generic`, calculations: GenericConfigs} ]  }) }
    });
    Engine = new Engine()
    Fuel = new Fuel()
    Ignition = new Ignition()

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
        })
        this.PinOverlay.pinOut = Pinouts[this.TargetDevice.value]
        this.Setup(prop)
    }

    get saveValue() { return super.saveValue }
    set saveValue(saveValue) {
        super.saveValue = saveValue
        this.RegisterVariables()
    }

    RegisterVariables() {
        VariableRegister.Clear()
        VariableRegister.CurrentTick = { name: `CurrentTick`, type: `tick`, id: VariableRegister.GenerateVariableId() }
        this.Inputs.RegisterVariables()
        this.CAN.RegisterVariables({ name: `CANParameters` })
        this.Engine.RegisterVariables()
        this.Fuel.RegisterVariables()
        this.Ignition.RegisterVariables()
        this.Dashboard.RegisterVariables()
        this.PinOverlay.update();
    }
}
customElements.define(`top-topengine`, TopEngine, { extends: `span` })