import { ConnectionType, RelationType } from './types';

export const CONNECTION_TYPES: ConnectionType[] = [
  ConnectionType.BPL,
  ConnectionType.APL,
  ConnectionType.UJJWALA,
  ConnectionType.Commercial,
];

export const RELATION_TYPES: RelationType[] = ['S/O', 'W/O'];

export const PANCHAYAT_VILLAGE_MAP = {
  'BIND': ['MIRACHAK', 'KUSHAHAR', 'BIND', 'VISHANPUR'],
  'TAJNIPUR': ['TAJNIPUR', 'NAURANGA', 'MADAN CHAK', 'SAIDPUR', 'RAJOPUR', 'RASALPUR'],
  'KATHRAHI': ['KATHRAHI', 'ISHWARCHAK', 'BAKARA', 'MAKANPUR', 'SURATPUR', 'JAKKI', 'LALUBIGAHA'],
  'JAHANA': ['JAHANA', 'RAMPUR', 'NIGRAIAN', 'NIRPUR', 'CHHATARPUR', 'KHALSA'],
  'JAMSARI': ['JAMSARI', 'DARIYAPUR', 'GHAZIPUR', 'BARHOG', 'GOVINDPUR', 'ALLIPUR'],
  'UTARTHU': ['UTARTHU', 'MASIA DEEH', 'MASIA BIGHA', 'NARAYANPUR', 'MUFTIPUR', 'AHIYACHACK', 'VISHUNPUR'],
  'LODIPUR': ['LODIPUR', 'NANORE', 'KHANPUR', 'JAKHAUR', 'CHHATTAR BIGHA', 'MOHHADIPUR', 'JAITIPUR', 'RASALPUR', 'IBRAHIMPUR'],
};

export const PANCHAYATS = [...Object.keys(PANCHAYAT_VILLAGE_MAP), 'Other'];
const allVillages = Object.values(PANCHAYAT_VILLAGE_MAP).flat();
export const VILLAGES = [...new Set(allVillages)];

export const AGENCIES = [
    'PARVATI HP GAS AGENCY GRAMIN VITRAK (GOPALBAD)',
    'RAM JANKI HP GAS GRAMIN VITRAK (BRANDI)',
    'SHREE RAM HP GAS GRAMIN VITRAK (BIHAR SHARIF)',
    'NARAYAN BHART GAS GRAMIN VITRAK (RAHUI)',
    'PRIYANKA INDIAN GRAMIN VITRAK (BIND)',
    'ABHAY SHANKAR INDIAN GRAMIN VITRAK (ASTHAWAN)',
    'J.P INDANE GAS GRAMIN VITRAK (BIHAR SHARIF)',
    'DHANANWAN BHARAT GAS GRAMIN VITRAK (DHANANWAN)',
    'SAI BHARAT GAS GRAMIN VITRAK (TEUS)',
    'SONALI BHARAT GAS GRAMIN VITRAK (BARH)',
    'BINDHYABASINI BHARAT GAS (BIHAR SHARIF)',
    'SAMRIDDHI BHARAT GAS GRAMIN VITRAK (SARMERA)',
    'BIPIN BHARAT GAS GRAMIN VITRAK (UGMA)',
    'Other'
];


export const TEMPLATE_HEADERS = ['Name', 'Customer ID', 'Consumer No', 'LPG ID', 'Relation Type', 'Relation Name', 'Mobile No', 'Village', 'Other Village', 'Panchayat', 'Other Panchayat', 'SV No', 'Aadhaar No', 'Connection Type', 'Agency Name', 'Due Date'];

export const GAS_COMPANIES = ['HP', 'BH', 'IN', 'Other'];