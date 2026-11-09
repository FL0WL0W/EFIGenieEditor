import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import GenericCalculation from "../Calculation/GenericCalculation"
import ConfigContainer from "./ConfigContainer"
import ConfigList from "./ConfigList"
import { CylinderAirTemperatureConfigs, ManifoldAbsolutePressureConfigs, VolumetricEfficiencyConfigs, ThrottlePositionConfigs } from "./TopConfigs"
import CylinderAirmassConfigs from "../CylinderAirmass/CylinderAirmassConfigs"
import { objectTester } from "../JavascriptUI/UIUtils";
var EngineRequirements = []
class EngineSensors extends ConfigContainer
{
    static template = `<div data-element="CrankPosition"></div><div data-element="CamPosition"></div><div data-element="CylinderAirTemperature"></div><div data-element="ManifoldAbsolutePressure"></div><div data-element="ThrottlePosition"></div>`

    CrankPosition = new CalculationOrVariableSelection({
        calculations:   undefined,
        label:          `Crank Position`,
        outputTypes:    [ `ReluctorResult` ],
    })
    CamPosition = new CalculationOrVariableSelection({
        calculations:   undefined,
        label:          `Cam Position`,
        outputTypes:    [ `ReluctorResult` ],
    })
    CylinderAirTemperature = new CalculationOrVariableSelection({
        calculations:   CylinderAirTemperatureConfigs,
        label:          `Cylinder Air Temperature`,
        outputUnits:    [ `°C` ],
    })
    ManifoldAbsolutePressure = new CalculationOrVariableSelection({
        calculations:   ManifoldAbsolutePressureConfigs,
        label:          `Manifold Absolute Pressure`,
        outputUnits:    [ `Bar` ],
    })
    ThrottlePosition = new CalculationOrVariableSelection({
        calculations:   ThrottlePositionConfigs,
        label:          `Throttle Position`,
        outputUnits:    [ `%` ],
    })
    constructor(prop) {
        super()
        this.label = `Engine Sensor Selection`
        this.Setup(prop)
    }
    get value() {
        let value = super.value
        value.CrankPriority = 1
        return value;
    }
    set value(value) { super.value = value }

    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        this.#reference = reference
        this.CrankPosition.reference = { ...reference, name: reference?.name? `${reference.name}.Crank Position` : `Crank Position` }
        this.CamPosition.reference = { ...reference, name: reference?.name? `${reference.name}.Cam Position` : `Cam Position` }
        this.ManifoldAbsolutePressure.reference = { ...reference, name: reference?.name? `${reference.name}.Manifold Absolute Pressure` : `Manifold Absolute Pressure` }
        this.ThrottlePosition.reference = { ...reference, name: reference?.name? `${reference.name}.Throttle Position` : `Throttle Position` }
        this.CylinderAirTemperature.reference = { ...reference, name: reference?.name? `${reference.name}.Cylinder Air Temperature` : `Cylinder Air Temperature` }
    }
}
customElements.define(`top-engine-sensors`, EngineSensors, { extends: `span` })

class EngineCalculations extends ConfigContainer
{
    static template = `<div data-element="CylinderAirmass"></div><div data-element="VolumetricEfficiency"></div>`

    CylinderAirmass = new CalculationOrVariableSelection({
        calculations:   CylinderAirmassConfigs,
        label:          `Cylinder Air Mass`,
        selectName:     `No Calculation`,
        outputUnits:    [ `g` ],
        value:          { selection: `CylinderAirmass_SpeedDensity` }
    })
    VolumetricEfficiency = new CalculationOrVariableSelection({
        calculations:   VolumetricEfficiencyConfigs,
        label:          `Volumetric Efficiency`,
        outputUnits:    [ `[0.0-1.0]` ],
        displayUnits:   [ `%` ]
    })
    constructor(prop) {
        super()
        this.label = `Engine Calculations`
        this.Setup(prop)
    }
    get value() {
        let value = super.value
        return value;
    }
    set value(value) { super.value = value }

    #reference = undefined
    get reference() { return this.#reference }
    set reference(reference) {
        this.#reference = reference
        this.CylinderAirmass.reference = { ...reference, name: reference?.name? `${reference.name}.Cylinder Air Mass` : `Cylinder Air Mass` }
        this.VolumetricEfficiency.reference = { ...reference, name: reference?.name? `${reference.name}.Volumetric Efficiency` : `Volumetric Efficiency` }
    }
}
customElements.define(`top-engine-calculations`, EngineCalculations, { extends: `span` })
export default class Engine extends ConfigList {
    constructor(prop) {
        prop = { ...prop,
            staticItems: [
                { name: `EngineSensors`, item: new EngineSensors()},
                { name: `EngineCalculations`, item: new EngineCalculations()},
            ],
            itemConstructor: GenericCalculation
        }
        super(prop)
    }

    static engineSpeedReference = { name: `EngineParameters.Engine Speed`, unit: `RPM` }
    disconnectedCallback() {
        super.disconnectedCallback()
        VariableRegister.UnRegisterVariable(Engine.engineSpeedReference)
    }
    connectedCallback() {
        super.connectedCallback()
        VariableRegister.RegisterVariable(Engine.engineSpeedReference)
    }
}
customElements.define(`top-engine`, Engine, { extends: `div` })