import RawInputConfigs from "./RawInputConfigs"
import Calculation_Static from "../Calculation/Calculation_Static"
import Calculation_LookupTable from "../Calculation/Calculation_LookupTable"
import Calculation_Polynomial from "../Calculation/Calculation_Polynomial"

let InputConfigs =  [
    { group: `Generic Pin Input`, calculations: RawInputConfigs},
    { group: `Custom Input`, calculations: [ 
        Calculation_Static,
        Calculation_LookupTable,
        Calculation_Polynomial
    ]}
]
export default InputConfigs