import Calculation_Static from "../Calculation/Calculation_Static"
import Calculation_LookupTable from "../Calculation/Calculation_LookupTable"
import Calculation_2AxisTable from "../Calculation/Calculation_2AxisTable"
import Calculation_Formula from "../Calculation/Calculation_Formula"

let AirmassConfigs = []
AirmassConfigs.push(Calculation_Static)
AirmassConfigs.push(Calculation_LookupTable)
AirmassConfigs.push(Calculation_2AxisTable)
AirmassConfigs.push(Calculation_Formula)
export default AirmassConfigs