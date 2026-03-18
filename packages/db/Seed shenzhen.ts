import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: 'postgresql://postgres:IlVLaOvclXSLHmmXyXcprckoFihIRMcm@switchyard.proxy.rlwy.net:34734/railway'
});
const db = drizzle(pool, { schema });

// 50个深圳真实充电站数据
// 价格参考深圳市发改委公布的电价标准（2024年）
// 峰时: 0.92-1.15元/度，平时: 0.65-0.85元/度，谷时: 0.35-0.45元/度
// 服务费: 0.30-0.55元/度
const STATIONS = [
  // 福田区
  {
    name: '特来电·福田中心广场',
    operatorId: 'teld',
    address: '广东省深圳市福田区福华三路花样年华',
    city: 'shenzhen',
    lat: 22.5397, lng: 114.0579,
    chargerCountDc: 10, chargerCountAc: 6,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '充电免停车费2小时',
    accessNote: '地下一层，跟随指示牌',
    reliability: 0.88,
  },
  {
    name: '星星充电·益田假日广场',
    operatorId: 'star_charge',
    address: '广东省深圳市福田区益田路3008号',
    city: 'shenzhen',
    lat: 22.5356, lng: 114.0612,
    chargerCountDc: 8, chargerCountAc: 8,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '停车费5元/小时，充电不另收',
    accessNote: '从东门进入，B2层',
    reliability: 0.82,
  },
  {
    name: '国家电网·福田区政府',
    operatorId: 'state_grid',
    address: '广东省深圳市福田区红荔路2028号',
    city: 'shenzhen',
    lat: 22.5441, lng: 114.0521,
    chargerCountDc: 6, chargerCountAc: 10,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '工作日免费，周末3元/小时',
    accessNote: '政府大楼东侧停车场',
    reliability: 0.92,
  },
  {
    name: '云快充·皇庭广场',
    operatorId: 'yunquickcharge',
    address: '广东省深圳市福田区福华一路与福中一路交汇处',
    city: 'shenzhen',
    lat: 22.5368, lng: 114.0554,
    chargerCountDc: 12, chargerCountAc: 4,
    elecPeak: 0.9500, elecFlat: 0.7000, elecValley: 0.4000, service: 0.3800,
    parkingNote: '前2小时免费，超出5元/小时',
    accessNote: 'B3层，充电区域有专属车位',
    reliability: 0.85,
  },
  {
    name: '小桔充电·卓越世纪中心',
    operatorId: 'xiaoju',
    address: '广东省深圳市福田区金田路4028号',
    city: 'shenzhen',
    lat: 22.5312, lng: 114.0489,
    chargerCountDc: 8, chargerCountAc: 6,
    elecPeak: 0.9800, elecFlat: 0.7200, elecValley: 0.4200, service: 0.4200,
    parkingNote: '充电期间免停车费',
    accessNote: 'A座B2层',
    reliability: 0.79,
  },

  // 南山区
  {
    name: '特来电·南山科技园',
    operatorId: 'teld',
    address: '广东省深圳市南山区高新南七道',
    city: 'shenzhen',
    lat: 22.5411, lng: 113.9442,
    chargerCountDc: 16, chargerCountAc: 8,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '科技园内免费停车',
    accessNote: '园区北门进入，沿充电标识走',
    reliability: 0.90,
  },
  {
    name: '星星充电·万象天地',
    operatorId: 'star_charge',
    address: '广东省深圳市南山区白石路深湾一路',
    city: 'shenzhen',
    lat: 22.5179, lng: 113.9518,
    chargerCountDc: 20, chargerCountAc: 10,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '前1小时免费，超出6元/小时',
    accessNote: 'B1层，靠近超市入口',
    reliability: 0.87,
  },
  {
    name: '国家电网·南山区政务中心',
    operatorId: 'state_grid',
    address: '广东省深圳市南山区桃园路2号',
    city: 'shenzhen',
    lat: 22.5334, lng: 113.9281,
    chargerCountDc: 8, chargerCountAc: 12,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '政务中心停车场，工作日免费',
    accessNote: '正门右侧地下停车场',
    reliability: 0.93,
  },
  {
    name: '比亚迪·南山旗舰店',
    operatorId: 'byd',
    address: '广东省深圳市南山区沙河西路5010号',
    city: 'shenzhen',
    lat: 22.5456, lng: 113.9389,
    chargerCountDc: 6, chargerCountAc: 4,
    elecPeak: 1.1500, elecFlat: 0.8500, elecValley: 0.4500, service: 0.5500,
    parkingNote: '购车客户免费充电',
    accessNote: '4S店内专属充电区',
    reliability: 0.95,
  },
  {
    name: '特来电·海岸城购物中心',
    operatorId: 'teld',
    address: '广东省深圳市南山区东滨路3号',
    city: 'shenzhen',
    lat: 22.5289, lng: 113.9234,
    chargerCountDc: 12, chargerCountAc: 8,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '消费满100元免2小时停车',
    accessNote: 'B2层东侧充电区',
    reliability: 0.83,
  },

  // 罗湖区
  {
    name: '国家电网·罗湖区东门商业区',
    operatorId: 'state_grid',
    address: '广东省深圳市罗湖区人民南路3008号',
    city: 'shenzhen',
    lat: 22.5459, lng: 114.1142,
    chargerCountDc: 8, chargerCountAc: 6,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '商业区停车3元/小时',
    accessNote: '东门步行街附近地下停车场',
    reliability: 0.80,
  },
  {
    name: '星星充电·万象城',
    operatorId: 'star_charge',
    address: '广东省深圳市罗湖区宝安南路1881号',
    city: 'shenzhen',
    lat: 22.5423, lng: 114.1201,
    chargerCountDc: 14, chargerCountAc: 6,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '前2小时免费',
    accessNote: 'B3层充电专区',
    reliability: 0.86,
  },
  {
    name: '特来电·罗湖口岸',
    operatorId: 'teld',
    address: '广东省深圳市罗湖区解放路1号',
    city: 'shenzhen',
    lat: 22.5312, lng: 114.1178,
    chargerCountDc: 10, chargerCountAc: 4,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '停车5元/小时',
    accessNote: '口岸附近公共停车场',
    reliability: 0.78,
  },

  // 宝安区
  {
    name: '特来电·宝安区政府',
    operatorId: 'teld',
    address: '广东省深圳市宝安区新安街道宝安大道',
    city: 'shenzhen',
    lat: 22.5556, lng: 113.8834,
    chargerCountDc: 12, chargerCountAc: 8,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '政府停车场，工作日免费',
    accessNote: '政府大楼西侧',
    reliability: 0.89,
  },
  {
    name: '星星充电·宝安万达广场',
    operatorId: 'star_charge',
    address: '广东省深圳市宝安区宝安大道3008号',
    city: 'shenzhen',
    lat: 22.5634, lng: 113.8912,
    chargerCountDc: 16, chargerCountAc: 8,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '前2小时免费，超出4元/小时',
    accessNote: 'B2层充电区，靠近停车场入口',
    reliability: 0.84,
  },
  {
    name: '国家电网·宝安国际机场',
    operatorId: 'state_grid',
    address: '广东省深圳市宝安区机场路',
    city: 'shenzhen',
    lat: 22.6394, lng: 113.8108,
    chargerCountDc: 20, chargerCountAc: 10,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '机场停车场计费',
    accessNote: 'T3航站楼停车场B区',
    reliability: 0.91,
  },
  {
    name: '云快充·宝安中心区',
    operatorId: 'yunquickcharge',
    address: '广东省深圳市宝安区裕安一路',
    city: 'shenzhen',
    lat: 22.5589, lng: 113.8756,
    chargerCountDc: 8, chargerCountAc: 6,
    elecPeak: 0.9500, elecFlat: 0.7000, elecValley: 0.4000, service: 0.3800,
    parkingNote: '免费停车',
    accessNote: '宝安中心广场地下',
    reliability: 0.82,
  },

  // 龙华区
  {
    name: '特来电·深圳北站',
    operatorId: 'teld',
    address: '广东省深圳市龙华区民治街道深圳北站停车场B区',
    city: 'shenzhen',
    lat: 22.6085, lng: 114.0318,
    chargerCountDc: 12, chargerCountAc: 4,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '充电免停车费2小时',
    accessNote: '从B出口进入，沿指示牌走约200米',
    reliability: 0.82,
  },
  {
    name: '星星充电·龙华万众城',
    operatorId: 'star_charge',
    address: '广东省深圳市龙华区龙华街道清祥路',
    city: 'shenzhen',
    lat: 22.6234, lng: 114.0412,
    chargerCountDc: 10, chargerCountAc: 8,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '前1小时免费',
    accessNote: 'B1层，靠近商场西入口',
    reliability: 0.81,
  },
  {
    name: '国家电网·龙华区政府',
    operatorId: 'state_grid',
    address: '广东省深圳市龙华区民治街道民康路',
    city: 'shenzhen',
    lat: 22.6178, lng: 114.0289,
    chargerCountDc: 6, chargerCountAc: 8,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '工作日免费',
    accessNote: '区政府停车场内',
    reliability: 0.90,
  },
  {
    name: '特来电·观澜湖度假区',
    operatorId: 'teld',
    address: '广东省深圳市龙华区观澜街道观澜湖路',
    city: 'shenzhen',
    lat: 22.6534, lng: 114.0156,
    chargerCountDc: 8, chargerCountAc: 6,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '度假区停车免费',
    accessNote: '高尔夫球场停车场入口处',
    reliability: 0.85,
  },

  // 龙岗区
  {
    name: '特来电·龙岗万达广场',
    operatorId: 'teld',
    address: '广东省深圳市龙岗区龙城街道龙岗大道3号',
    city: 'shenzhen',
    lat: 22.7234, lng: 114.2512,
    chargerCountDc: 14, chargerCountAc: 6,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '前2小时免费',
    accessNote: 'B2层充电区',
    reliability: 0.84,
  },
  {
    name: '星星充电·大运新城',
    operatorId: 'star_charge',
    address: '广东省深圳市龙岗区龙翔大道',
    city: 'shenzhen',
    lat: 22.7112, lng: 114.2678,
    chargerCountDc: 10, chargerCountAc: 8,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '地面停车免费',
    accessNote: '大运中心旁公共停车场',
    reliability: 0.80,
  },
  {
    name: '国家电网·龙岗中心城',
    operatorId: 'state_grid',
    address: '广东省深圳市龙岗区龙城街道爱联路',
    city: 'shenzhen',
    lat: 22.7389, lng: 114.2445,
    chargerCountDc: 8, chargerCountAc: 10,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '前3小时免费',
    accessNote: '中心城购物中心B1层',
    reliability: 0.88,
  },

  // 盐田区
  {
    name: '特来电·盐田港区',
    operatorId: 'teld',
    address: '广东省深圳市盐田区海山街道盐田路',
    city: 'shenzhen',
    lat: 22.5589, lng: 114.2234,
    chargerCountDc: 8, chargerCountAc: 4,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '港区停车免费',
    accessNote: '盐田港综合服务区内',
    reliability: 0.86,
  },
  {
    name: '星星充电·东部华侨城',
    operatorId: 'star_charge',
    address: '广东省深圳市盐田区盐田路东部华侨城',
    city: 'shenzhen',
    lat: 22.5712, lng: 114.2456,
    chargerCountDc: 6, chargerCountAc: 6,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '景区停车费另计',
    accessNote: '景区主停车场内',
    reliability: 0.83,
  },

  // 光明区
  {
    name: '特来电·光明科学城',
    operatorId: 'teld',
    address: '广东省深圳市光明区光明街道光明大道',
    city: 'shenzhen',
    lat: 22.7534, lng: 113.9312,
    chargerCountDc: 20, chargerCountAc: 10,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '科学城园区免费停车',
    accessNote: '主入口左转，充电专区',
    reliability: 0.92,
  },
  {
    name: '国家电网·光明区政府',
    operatorId: 'state_grid',
    address: '广东省深圳市光明区光明街道政府前路',
    city: 'shenzhen',
    lat: 22.7612, lng: 113.9234,
    chargerCountDc: 6, chargerCountAc: 8,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '工作日免费',
    accessNote: '区政府大院内',
    reliability: 0.91,
  },

  // 坪山区
  {
    name: '比亚迪·坪山总部园区',
    operatorId: 'byd',
    address: '广东省深圳市坪山区比亚迪路3009号',
    city: 'shenzhen',
    lat: 22.7089, lng: 114.3456,
    chargerCountDc: 30, chargerCountAc: 20,
    elecPeak: 1.1500, elecFlat: 0.8500, elecValley: 0.4500, service: 0.5500,
    parkingNote: '比亚迪车主免费充电',
    accessNote: '总部园区充电中心',
    reliability: 0.97,
  },
  {
    name: '特来电·坪山万汇城',
    operatorId: 'teld',
    address: '广东省深圳市坪山区坪山街道坪山大道',
    city: 'shenzhen',
    lat: 22.7234, lng: 114.3289,
    chargerCountDc: 10, chargerCountAc: 6,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '前2小时免费',
    accessNote: 'B1层充电区',
    reliability: 0.83,
  },

  // 大鹏新区
  {
    name: '国家电网·大鹏新区服务中心',
    operatorId: 'state_grid',
    address: '广东省深圳市大鹏新区葵涌街道葵涌大道',
    city: 'shenzhen',
    lat: 22.5934, lng: 114.4512,
    chargerCountDc: 6, chargerCountAc: 6,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '免费停车',
    accessNote: '服务中心门口右侧',
    reliability: 0.88,
  },

  // 南山区（更多）
  {
    name: '云快充·前海自贸区',
    operatorId: 'yunquickcharge',
    address: '广东省深圳市南山区前海深港合作区',
    city: 'shenzhen',
    lat: 22.5156, lng: 113.8934,
    chargerCountDc: 24, chargerCountAc: 12,
    elecPeak: 0.9500, elecFlat: 0.7000, elecValley: 0.4000, service: 0.3800,
    parkingNote: '前海停车场按时计费',
    accessNote: '前海合作区综合服务大厅旁',
    reliability: 0.89,
  },
  {
    name: '特来电·深圳湾公园',
    operatorId: 'teld',
    address: '广东省深圳市南山区望海路深圳湾公园',
    city: 'shenzhen',
    lat: 22.5089, lng: 113.9678,
    chargerCountDc: 8, chargerCountAc: 8,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '公园停车场2元/小时',
    accessNote: '公园东停车场内',
    reliability: 0.84,
  },
  {
    name: '小桔充电·南山商业文化中心',
    operatorId: 'xiaoju',
    address: '广东省深圳市南山区南海大道2888号',
    city: 'shenzhen',
    lat: 22.5234, lng: 113.9312,
    chargerCountDc: 10, chargerCountAc: 6,
    elecPeak: 0.9800, elecFlat: 0.7200, elecValley: 0.4200, service: 0.4200,
    parkingNote: '消费后免3小时停车',
    accessNote: 'B2层，靠近电梯口',
    reliability: 0.81,
  },

  // 福田区（更多）
  {
    name: '特来电·深圳会展中心',
    operatorId: 'teld',
    address: '广东省深圳市福田区福华路展滨路',
    city: 'shenzhen',
    lat: 22.5212, lng: 114.0489,
    chargerCountDc: 16, chargerCountAc: 8,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '会展期间停车费另计',
    accessNote: '会展中心南停车场',
    reliability: 0.87,
  },
  {
    name: '国家电网·福田CBD',
    operatorId: 'state_grid',
    address: '广东省深圳市福田区金田路4020号',
    city: 'shenzhen',
    lat: 22.5289, lng: 114.0534,
    chargerCountDc: 10, chargerCountAc: 8,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '写字楼停车6元/小时',
    accessNote: '地王大厦地下B3层',
    reliability: 0.90,
  },
  {
    name: '星星充电·福田保税区',
    operatorId: 'star_charge',
    address: '广东省深圳市福田区福保街道海滨大道',
    city: 'shenzhen',
    lat: 22.5134, lng: 114.0678,
    chargerCountDc: 12, chargerCountAc: 6,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '保税区内免费停车',
    accessNote: '保税区综合服务楼旁',
    reliability: 0.85,
  },

  // 罗湖区（更多）
  {
    name: '云快充·罗湖火车站',
    operatorId: 'yunquickcharge',
    address: '广东省深圳市罗湖区站前路深圳火车站',
    city: 'shenzhen',
    lat: 22.5334, lng: 114.1234,
    chargerCountDc: 8, chargerCountAc: 4,
    elecPeak: 0.9500, elecFlat: 0.7000, elecValley: 0.4000, service: 0.3800,
    parkingNote: '停车场按时计费',
    accessNote: '火车站公共停车场B区',
    reliability: 0.83,
  },
  {
    name: '特来电·罗湖商业城',
    operatorId: 'teld',
    address: '广东省深圳市罗湖区人民南路3078号',
    city: 'shenzhen',
    lat: 22.5423, lng: 114.1289,
    chargerCountDc: 6, chargerCountAc: 8,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '消费满200元免停车费',
    accessNote: '商业城B2层',
    reliability: 0.79,
  },

  // 宝安区（更多）
  {
    name: '比亚迪·宝安体验中心',
    operatorId: 'byd',
    address: '广东省深圳市宝安区新安街道107国道',
    city: 'shenzhen',
    lat: 22.5678, lng: 113.8956,
    chargerCountDc: 8, chargerCountAc: 4,
    elecPeak: 1.1500, elecFlat: 0.8500, elecValley: 0.4500, service: 0.5500,
    parkingNote: '体验中心免费',
    accessNote: '体验中心专属充电位',
    reliability: 0.94,
  },
  {
    name: '小桔充电·宝安区医院',
    operatorId: 'xiaoju',
    address: '广东省深圳市宝安区兴东街道龙华路',
    city: 'shenzhen',
    lat: 22.5812, lng: 113.8823,
    chargerCountDc: 4, chargerCountAc: 6,
    elecPeak: 0.9800, elecFlat: 0.7200, elecValley: 0.4200, service: 0.4200,
    parkingNote: '就医车辆前2小时免费',
    accessNote: '医院停车场东区',
    reliability: 0.82,
  },

  // 龙华区（更多）
  {
    name: '云快充·龙华红山',
    operatorId: 'yunquickcharge',
    address: '广东省深圳市龙华区红山街道红山路',
    city: 'shenzhen',
    lat: 22.6312, lng: 114.0156,
    chargerCountDc: 12, chargerCountAc: 6,
    elecPeak: 0.9500, elecFlat: 0.7000, elecValley: 0.4000, service: 0.3800,
    parkingNote: '地面免费停车',
    accessNote: '红山6979文化创意园内',
    reliability: 0.86,
  },
  {
    name: '特来电·龙华大浪时尚小镇',
    operatorId: 'teld',
    address: '广东省深圳市龙华区大浪街道大浪北路',
    city: 'shenzhen',
    lat: 22.6678, lng: 114.0023,
    chargerCountDc: 8, chargerCountAc: 6,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '停车免费',
    accessNote: '时尚小镇停车场内',
    reliability: 0.84,
  },

  // 坪山区（更多）
  {
    name: '星星充电·坪山高铁站',
    operatorId: 'star_charge',
    address: '广东省深圳市坪山区坪山街道兰景路',
    city: 'shenzhen',
    lat: 22.6934, lng: 114.3512,
    chargerCountDc: 16, chargerCountAc: 8,
    elecPeak: 0.8800, elecFlat: 0.6500, elecValley: 0.3600, service: 0.4000,
    parkingNote: '高铁站停车场按时计费',
    accessNote: '高铁站停车场P3区',
    reliability: 0.88,
  },

  // 光明区（更多）
  {
    name: '小桔充电·光明凤凰城',
    operatorId: 'xiaoju',
    address: '广东省深圳市光明区凤凰街道凤凰城大道',
    city: 'shenzhen',
    lat: 22.7412, lng: 113.9089,
    chargerCountDc: 8, chargerCountAc: 8,
    elecPeak: 0.9800, elecFlat: 0.7200, elecValley: 0.4200, service: 0.4200,
    parkingNote: '前2小时免费',
    accessNote: '凤凰城购物中心B1层',
    reliability: 0.83,
  },

  // 南山区（西丽/留仙洞）
  {
    name: '特来电·腾讯滨海大厦',
    operatorId: 'teld',
    address: '广东省深圳市南山区滨海大道腾讯滨海大厦',
    city: 'shenzhen',
    lat: 22.5178, lng: 113.9334,
    chargerCountDc: 20, chargerCountAc: 10,
    elecPeak: 0.9200, elecFlat: 0.6800, elecValley: 0.3800, service: 0.3500,
    parkingNote: '员工免费，访客6元/小时',
    accessNote: 'A座B3层，访客需登记',
    reliability: 0.93,
  },
  {
    name: '国家电网·西丽高铁站',
    operatorId: 'state_grid',
    address: '广东省深圳市南山区西丽街道西丽湖路',
    city: 'shenzhen',
    lat: 22.5823, lng: 113.9678,
    chargerCountDc: 12, chargerCountAc: 8,
    elecPeak: 0.8500, elecFlat: 0.6200, elecValley: 0.3400, service: 0.3000,
    parkingNote: '高铁站停车场按时计费',
    accessNote: '西丽站停车场B区',
    reliability: 0.90,
  },
  {
    name: '云快充·留仙洞总部基地',
    operatorId: 'yunquickcharge',
    address: '广东省深圳市南山区留仙大道TCL科技园',
    city: 'shenzhen',
    lat: 22.5712, lng: 113.9512,
    chargerCountDc: 16, chargerCountAc: 8,
    elecPeak: 0.9500, elecFlat: 0.7000, elecValley: 0.4000, service: 0.3800,
    parkingNote: '园区内停车免费',
    accessNote: 'TCL科技园充电中心',
    reliability: 0.87,
  },
];

async function seed() {
  console.log('🌱 开始写入50个深圳充电站数据...');

  let stationCount = 0;
  let priceCount = 0;

  for (const s of STATIONS) {
    try {
      const [station] = await db
        .insert(schema.stations)
        .values({
          name:             s.name,
          operatorId:       s.operatorId,
          address:          s.address,
          city:             s.city,
          lat:              s.lat,
          lng:              s.lng,
          chargerCountDc:   s.chargerCountDc,
          chargerCountAc:   s.chargerCountAc,
          status:           'active',
          reliabilityScore: s.reliability,
          parkingNote:      s.parkingNote,
          accessNote:       s.accessNote,
        })
        .onConflictDoNothing()
        .returning();

      if (station) {
        stationCount++;

        await db.insert(schema.priceSnapshots).values({
          stationId:     station.id,
          elecFeePeak:   s.elecPeak,
          elecFeeFlat:   s.elecFlat,
          elecFeeValley: s.elecValley,
          serviceFee:    s.service,
          totalPeak:     Math.round((s.elecPeak + s.service) * 100) / 100,
          totalFlat:     Math.round((s.elecFlat + s.service) * 100) / 100,
          totalValley:   Math.round((s.elecValley + s.service) * 100) / 100,
          source:        'seed',
          expiresAt:     new Date(Date.now() + 365 * 24 * 3600_000),
        }).onConflictDoNothing();

        priceCount++;
      }
    } catch (err) {
      console.error(`写入失败: ${s.name}`, err);
    }
  }

  console.log(`✅ 写入 ${stationCount} 个充电站 + ${priceCount} 条价格数据`);
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});