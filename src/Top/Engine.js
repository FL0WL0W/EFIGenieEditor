import CalculationOrVariableSelection from "../Calculation/CalculationOrVariableSelection"
import GenericCalculation from "../Calculation/GenericCalculation"
import ConfigContainer from "./ConfigContainer"
import ConfigList from "./ConfigList"
import { CylinderAirTemperatureConfigs, ManifoldAbsolutePressureConfigs, VolumetricEfficiencyConfigs, ThrottlePositionConfigs } from "./TopConfigs"
import CylinderAirmassConfigs from "../CylinderAirmass/CylinderAirmassConfigs"
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
        if(this.ManifoldAbsolutePressure.hidden) 
            delete value.ManifoldAbsolutePressure
        if(this.ThrottlePosition.hidden) 
            delete value.ThrottlePosition
        if(this.CylinderAirTemperature.hidden) 
            delete value.CylinderAirTemperature
        return value;
    }
    set value(value) { super.value = value }

    RegisterVariables() {
        this.CrankPosition.RegisterVariables({ name: `EngineParameters.Crank Position` })
        this.CamPosition.RegisterVariables({ name: `EngineParameters.Cam Position` })

        this.ManifoldAbsolutePressure.hidden = (EngineRequirements?.indexOf(`Manifold Absolute Pressure`) ?? -1) === -1
        if(!this.ManifoldAbsolutePressure.hidden) 
            this.ManifoldAbsolutePressure.RegisterVariables({ name: `EngineParameters.Manifold Absolute Pressure` })

        this.ThrottlePosition.hidden = (EngineRequirements?.indexOf(`Throttle Position`) ?? -1) === -1
        if(!this.ThrottlePosition.hidden) 
            this.ThrottlePosition.RegisterVariables({ name: `EngineParameters.Throttle Position` })
        
        this.CylinderAirTemperature.hidden = (EngineRequirements?.indexOf(`Cylinder Air Temperature`) ?? -1) === -1
        if(!this.CylinderAirTemperature.hidden) 
            this.CylinderAirTemperature.RegisterVariables({ name: `EngineParameters.Cylinder Air Temperature` })
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
        if(this.VolumetricEfficiency.hidden) 
            delete value.VolumetricEfficiency
        return value;
    }
    set value(value) { super.value = value }

    RegisterVariables() {
        this.CylinderAirmass.RegisterVariables({ name: `EngineParameters.Cylinder Air Mass` })

        EngineRequirements = this.CylinderAirmass.GetSubConfigProperty(`Requirements`)
        
        this.VolumetricEfficiency.hidden = (EngineRequirements?.indexOf(`Volumetric Efficiency`) ?? -1) === -1
        if(!this.VolumetricEfficiency.hidden) 
            this.VolumetricEfficiency.RegisterVariables({ name: `EngineParameters.Volumetric Efficiency` })
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

    RegisterVariables() {
        VariableRegister.RegisterVariable({ name: `EngineParameters.Engine Speed`, unit: `RPM` })
        super.RegisterVariables({ name: `EngineParameters` })
        super.RegisterVariables({ name: `EngineParameters` })
    }
}
customElements.define(`top-engine`, Engine, { extends: `div` })