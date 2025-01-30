import Calculation_Static from "../Calculation/Calculation_Static"
import Calculation_LookupTable from "../Calculation/Calculation_LookupTable"
import Calculation_2AxisTable from "../Calculation/Calculation_2AxisTable"
import Calculation_Formula from "../Calculation/Calculation_Formula"

export let AFRConfigs = []
AFRConfigs.push(Calculation_Static)
AFRConfigs.push(Calculation_LookupTable)
AFRConfigs.push(Calculation_2AxisTable)
AFRConfigs.push(Calculation_Formula)

export let InjectorEnableConfigs = []
InjectorEnableConfigs.push(Calculation_Static)
InjectorEnableConfigs.push(Calculation_Formula)

export let IgnitionEnableConfigs = []
IgnitionEnableConfigs.push(Calculation_Static)
IgnitionEnableConfigs.push(Calculation_Formula)

export let IgnitionAdvanceConfigs = []
IgnitionAdvanceConfigs.push(Calculation_Static)
IgnitionAdvanceConfigs.push(Calculation_LookupTable)
IgnitionAdvanceConfigs.push(Calculation_2AxisTable)
IgnitionAdvanceConfigs.push(Calculation_Formula)

export let IgnitionDwellConfigs = []
IgnitionDwellConfigs.push(Calculation_Static)
IgnitionDwellConfigs.push(Calculation_LookupTable)
IgnitionDwellConfigs.push(Calculation_2AxisTable)
IgnitionDwellConfigs.push(Calculation_Formula)

export let CylinderAirTemperatureConfigs = []
CylinderAirTemperatureConfigs.push(Calculation_Static)
CylinderAirTemperatureConfigs.push(Calculation_Formula)

export let ManifoldAbsolutePressureConfigs = []
ManifoldAbsolutePressureConfigs.push(Calculation_Static)
ManifoldAbsolutePressureConfigs.push(Calculation_Formula)

export let ThrottlePositionConfigs = []
ThrottlePositionConfigs.push(Calculation_Static)
ThrottlePositionConfigs.push(Calculation_Formula)

export let VolumetricEfficiencyConfigs = []
VolumetricEfficiencyConfigs.push(Calculation_Static)
VolumetricEfficiencyConfigs.push(Calculation_LookupTable)
VolumetricEfficiencyConfigs.push(Calculation_2AxisTable)
VolumetricEfficiencyConfigs.push(Calculation_Formula)