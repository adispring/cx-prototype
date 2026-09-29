window.HM_ORDER_DATA = {
  status: {
    pay:{text:'待付款',tone:'warn',desc:'订单尚未付款，请在有效时间内完成支付。'},
    ship:{text:'待发货',tone:'blue',desc:'订单已付款，商家正在准备商品。'},
    receive:{text:'待收货',tone:'green',desc:'商品已发出，请留意物流进度。'},
    done:{text:'已完成',tone:'gray',desc:'订单已完成，如有问题可在售后有效期内申请售后。'},
    cancel:{text:'已取消',tone:'gray',desc:'订单已关闭，无需继续支付。'},
    as:{text:'售后中',tone:'red',desc:'售后申请已提交，商家正在处理中。'}
  },
  orders:[
    {no:'HM-20260917-001',time:'2026-09-17 09:42',status:'receive',name:'HiMakers PLA 耗材 1kg（白色）',spec:'1.75mm · 白色 · 1kg/卷',qty:2,price:'158.00',img:'assets/member/order-pla-filament.png',carrier:'顺丰速运',tracking:'SF1032887769',shipIcon:'truck',shipText:'顺丰速运 · SF1032887769 · 预计 09-19 送达'},
    {no:'HM-20260921-010',time:'2026-09-21 20:14',status:'pay',name:'PEI 弹性打印板 235×235',spec:'含磁吸底座',qty:1,price:'129.00',img:'assets/member/device-printer-p2.png',shipIcon:'clock',shipText:'等待付款 · 剩余 23h 12m，超时订单自动取消'},
    {no:'HM-20260920-014',time:'2026-09-20 11:02',status:'ship',name:'黄铜喷嘴套装 0.2/0.4/0.6mm',spec:'10 件/盒',qty:1,price:'45.00',img:'assets/member/device-cnc-c1.png',carrier:'顺丰速运',tracking:'等待揽收',shipIcon:'box',shipText:'商家已打包，待快递揽收'},
    {no:'HM-20260919-006',time:'2026-09-19 09:40',status:'receive',name:'光固化树脂 500ml（灰色）',spec:'标准刚性 · 405nm',qty:2,price:'178.00',img:'assets/member/order-uv-resin.png',carrier:'中通快递',tracking:'73128465509123',shipIcon:'truck',shipText:'中通快递 · 73128465509123 · 派送中，预计今日送达'},
    {no:'HM-20260915-003',time:'2026-09-15 16:20',status:'done',name:'HiMakers Laser X1 激光雕刻机',spec:'10W · 标准版 · 含防护罩',qty:1,price:'3,999.00',img:'assets/member/device-laser-x1.png',carrier:'顺丰速运',tracking:'SF1032770158',shipIcon:'check',shipText:'已于 2026-09-16 14:20 签收 · 顺丰速运'},
    {no:'HM-20260918-002',time:'2026-09-18 13:09',status:'done',name:'桌面手机支架（铝合金）',spec:'深空灰 · 可折叠',qty:1,price:'39.00',img:'assets/member/device-printer-p2.png',carrier:'圆通速递',tracking:'YT92609190041',shipIcon:'check',shipText:'已于 09-19 10:02 签收 · 签收人：本人'},
    {no:'HM-20260917-011',time:'2026-09-17 15:27',status:'as',name:'HiMakers PLA 耗材 1kg（白色）',spec:'1.75mm · 白色 · 1kg/卷',qty:1,price:'59.00',img:'assets/member/order-pla-filament.png',shipIcon:'alert',shipText:'售后中：商品破损 / 变形 · 商家处理中，预计 48h 内响应'},
    {no:'HM-20260916-009',time:'2026-09-16 08:53',status:'cancel',name:'光固化树脂 500ml（肤色）',spec:'高韧性 · 405nm',qty:2,price:'158.00',img:'assets/member/order-uv-resin.png',shipIcon:'x',shipText:'超时未付款，已自动关闭'},
    {no:'HM-20260915-007',time:'2026-09-15 16:20',status:'done',name:'HiMakers CNC C1 配件包',spec:'含润滑脂 20g',qty:1,price:'199.00',img:'assets/member/device-cnc-c1.png',carrier:'顺丰速运',tracking:'SF1032757007',shipIcon:'check',shipText:'已于 09-17 14:40 签收 · 签收人：前台代收'},
    {no:'HM-20260914-004',time:'2026-09-14 10:11',status:'done',name:'Laser X1 保护镜片 × 2',spec:'原厂配件',qty:1,price:'89.00',img:'assets/member/device-laser-x1.png',carrier:'顺丰速运',tracking:'SF1032744004',shipIcon:'check',shipText:'已于 09-16 09:15 签收 · 签收人：本人'},
    {no:'HM-20260913-016',time:'2026-09-13 21:36',status:'receive',name:'HiMakers P2 耗材套件',spec:'PLA 试用装 × 6',qty:3,price:'267.00',img:'assets/member/device-printer-p2.png',carrier:'顺丰速运',tracking:'SF1032911223',shipIcon:'truck',shipText:'顺丰速运 · SF1032911223 · 运输中，预计明日送达'},
    {no:'HM-20260912-008',time:'2026-09-12 11:05',status:'cancel',name:'光固化树脂 500ml（灰色）',spec:'标准刚性 · 405nm',qty:3,price:'267.00',img:'assets/member/order-uv-resin.png',shipIcon:'x',shipText:'超时未付款，已自动关闭'}
  ],
  logistics:{
    'HM-20260917-001':{state:'待收货',desc:'快件已到达【深圳南山科技园营业点】，快递员正在派送',eta:'预计送达 09-19',carrier:'顺丰速运',no:'SF1032887769',shipAt:'2026-09-17 15:30',addr:'张伟 138****6721 · 广东省深圳市南山区科技园南区 8 栋 1203',updated:'最后更新 2026-09-18 08:12',track:[['派送中 · 快件已到达【深圳南山科技园营业点】，快递员 张师傅 138****6721 正在派送','2026-09-18 08:12'],['运输中 · 快件已到达【深圳转运中心】','2026-09-18 03:40'],['运输中 · 快件已从【广州转运中心】发出，下一站【深圳转运中心】','2026-09-17 21:15'],['已揽收 · 顺丰速运已揽收，发货仓库：广州仓','2026-09-17 15:30'],['已下单 · 订单支付成功，等待商家发货','2026-09-17 09:42']]},
    'HM-20260915-003':{state:'已签收',desc:'你的快件已由本人签收，感谢使用顺丰速运',eta:'签收时间 2026-09-16 14:20',carrier:'顺丰速运',no:'SF1032770158',shipAt:'2026-09-15 20:10',addr:'张伟 138****6721 · 广东省深圳市南山区科技园南区 8 栋 1203',updated:'最后更新 2026-09-16 14:20',track:[['已签收 · 快件已签收，签收人：本人','2026-09-16 14:20'],['派送中 · 快件已到达【深圳南山科技园营业点】，快递员 李师傅 139****3810 正在派送','2026-09-16 09:05'],['运输中 · 快件已到达【深圳转运中心】','2026-09-16 02:48'],['已揽收 · 顺丰速运已揽收，发货仓库：广州仓','2026-09-15 20:10'],['已下单 · 订单支付成功，等待商家发货','2026-09-15 16:20']]}
  }
};
