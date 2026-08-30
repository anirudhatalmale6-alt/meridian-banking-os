/* =========================================================================
   MERIDIAN — demonstration dataset.
   Entirely synthetic. No real customer, account or transaction data.
   Figures are illustrative and sized for a mid-size commercial bank.
   ========================================================================= */
window.DB = (function () {

  /* ------------------------------------------------- balance sheet trend */
  // 12 months to Aug-2026. Amounts in INR crore.
  const months = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
  const deposits = [41820,42310,43050,44190,44720,45380,46910,47240,48020,48870,49510,50240];
  const advances = [31240,31760,32180,33020,33410,33980,35120,35460,36010,36720,37280,37940];

  /* --------------------------------------------------------------- KPIs */
  const kpis = [
    { k:'Total deposits',  v:50240, u:'Cr', d:+1.47, note:'vs Jul-2026', spark:deposits },
    { k:'Gross advances',  v:37940, u:'Cr', d:+1.77, note:'vs Jul-2026', spark:advances },
    { k:'CASA ratio',      v:43.8,  u:'%',  d:+0.60, note:'vs Jul-2026', spark:[41.2,41.5,41.9,42.1,42.0,42.4,42.8,42.9,43.1,43.4,43.2,43.8] },
    { k:'Net interest margin', v:3.62, u:'%', d:-0.04, note:'vs Jul-2026', spark:[3.71,3.70,3.68,3.69,3.66,3.67,3.70,3.68,3.65,3.66,3.66,3.62] },
    { k:'Liquidity coverage', v:138.4, u:'%', d:+2.10, note:'regulatory floor 100%', spark:[129,131,130,133,132,134,135,134,136,135,136,138] },
    { k:'Gross NPA',       v:2.14,  u:'%',  d:-0.09, note:'vs Jul-2026', spark:[2.61,2.55,2.50,2.44,2.41,2.38,2.30,2.29,2.26,2.23,2.23,2.14], inverse:true }
  ];

  /* ------------------------------------------------------ exception queue */
  const exceptions = [
    { id:'EXC-88214', type:'AML alert',        sev:'high', desc:'Structuring pattern — 7 cash deposits below threshold in 4 days', ent:'Harbourline Exports Pvt Ltd', age:'4h', owner:'FCC' },
    { id:'EXC-88209', type:'Settlement fail',  sev:'high', desc:'NEFT outward batch 14 unconfirmed at clearing', ent:'Batch NEFT-2608-14', age:'6h', owner:'Payments Ops' },
    { id:'EXC-88198', type:'Sanctions hit',    sev:'high', desc:'Name match 91% against consolidated watchlist — pending disposition', ent:'A. Kirilenko', age:'11h', owner:'FCC' },
    { id:'EXC-88176', type:'GL suspense',      sev:'med',  desc:'Unreconciled suspense balance beyond 3-day policy', ent:'GL 71104 · Suspense — inward', age:'1d', owner:'Finance' },
    { id:'EXC-88155', type:'KYC expiry',       sev:'med',  desc:'42 corporate customers with re-KYC overdue this cycle', ent:'Bulk — corporate book', age:'2d', owner:'Onboarding' },
    { id:'EXC-88121', type:'Limit breach',     sev:'med',  desc:'Intraday dealer limit exceeded on FX desk by 4.2%', ent:'Treasury · FX spot', age:'2d', owner:'Market Risk' },
    { id:'EXC-88094', type:'Dormant activity', sev:'low',  desc:'Debit on account dormant for 19 months — review required', ent:'SB 4021 0099 1187', age:'3d', owner:'Branch Ops' }
  ];

  /* ---------------------------------------------------------- customers */
  const customers = [
    { id:'CIF-1004821', name:'Harbourline Exports Pvt Ltd', type:'Corporate', seg:'Mid-corporate', kyc:'Review due', risk:'High',   since:'2016-04-11', rm:'S. Iyer',   pan:'AAECH••••K', dob:'—', country:'India',
      contact:{ ph:'+91 22 •••• 4410', em:'treasury@harbourline.example', addr:'Unit 12, Sassoon Dock, Colaba, Mumbai 400005' },
      exposure:{ dep:18.42, adv:64.80, ccy:'Cr' },
      screening:'Adverse media — 1 open item', docs:['Certificate of incorporation','Board resolution','GST registration','Audited financials FY25'] },
    { id:'CIF-1002119', name:'Vasanth R. Menon', type:'Individual', seg:'Priority', kyc:'Verified', risk:'Low', since:'2011-09-02', rm:'A. Fernandes', pan:'BQPPM••••C', dob:'1979-03-14', country:'India',
      contact:{ ph:'+91 98•••• 2210', em:'v.menon@example.com', addr:'Flat 604, Palm Grove, Bengaluru 560034' },
      exposure:{ dep:1.24, adv:0.72, ccy:'Cr' },
      screening:'Clear', docs:['Passport','Address proof','Income proof'] },
    { id:'CIF-1006540', name:'Aruna Textiles LLP', type:'Corporate', seg:'SME', kyc:'Verified', risk:'Medium', since:'2019-11-27', rm:'S. Iyer', pan:'AAKFA••••P', dob:'—', country:'India',
      contact:{ ph:'+91 422 •••• 7781', em:'accounts@arunatex.example', addr:'SIDCO Industrial Estate, Coimbatore 641021' },
      exposure:{ dep:2.61, adv:14.30, ccy:'Cr' },
      screening:'Clear', docs:['LLP agreement','GST registration','Stock statement Jul-26'] },
    { id:'CIF-1009003', name:'Northgate Logistics Ltd', type:'Corporate', seg:'Large corporate', kyc:'Verified', risk:'Medium', since:'2014-02-18', rm:'D. Kapoor', pan:'AABCN••••F', dob:'—', country:'Singapore',
      contact:{ ph:'+65 6••• 2290', em:'finance@northgate.example', addr:'8 Marina View, Singapore 018960' },
      exposure:{ dep:44.10, adv:128.60, ccy:'Cr' },
      screening:'Clear', docs:['Certificate of incorporation','UBO declaration','FATCA/CRS self-certification'] },
    { id:'CIF-1007712', name:'Meera Krishnan', type:'Individual', seg:'Retail', kyc:'Pending', risk:'Low', since:'2026-08-24', rm:'—', pan:'CJTPK••••L', dob:'1994-07-30', country:'India',
      contact:{ ph:'+91 90•••• 8845', em:'meera.k@example.com', addr:'22 Anna Nagar West, Chennai 600040' },
      exposure:{ dep:0.03, adv:0, ccy:'Cr' },
      screening:'Pending', docs:['Aadhaar (masked)'] },
    { id:'CIF-1005388', name:'Silverline Hospitality Pvt Ltd', type:'Corporate', seg:'SME', kyc:'Verified', risk:'Medium', since:'2018-06-05', rm:'D. Kapoor', pan:'AAGCS••••B', dob:'—', country:'India',
      contact:{ ph:'+91 20 •••• 3390', em:'cfo@silverline.example', addr:'Baner Road, Pune 411045' },
      exposure:{ dep:5.88, adv:22.15, ccy:'Cr' },
      screening:'Clear', docs:['Certificate of incorporation','Lease deed','Audited financials FY25'] }
  ];

  /* ----------------------------------------------------------- accounts */
  const accounts = [
    { no:'SB 4021 0099 1187', cif:'CIF-1002119', nm:'Vasanth R. Menon',            prod:'Savings — Priority',        cur:'INR', bal:  1842660.40, st:'Active',  br:'BLR-014', open:'2011-09-02' },
    { no:'CA 4102 7781 0034', cif:'CIF-1004821', nm:'Harbourline Exports Pvt Ltd', prod:'Current — Trade',           cur:'INR', bal:184229104.00, st:'Active',  br:'MUM-002', open:'2016-04-11' },
    { no:'CA 4102 7781 0035', cif:'CIF-1004821', nm:'Harbourline Exports Pvt Ltd', prod:'Current — EEFC',            cur:'USD', bal:   842110.55, st:'Active',  br:'MUM-002', open:'2017-01-20' },
    { no:'TD 5507 1123 8890', cif:'CIF-1009003', nm:'Northgate Logistics Ltd',     prod:'Term deposit — 24m @ 7.15%', cur:'INR', bal:441000000.00, st:'Active',  br:'MUM-002', open:'2025-03-14' },
    { no:'LN 6604 3391 0021', cif:'CIF-1006540', nm:'Aruna Textiles LLP',          prod:'Working capital — CC',      cur:'INR', bal:-143028811.25,st:'Active',  br:'CBE-007', open:'2019-11-27' },
    { no:'LN 6604 8812 4410', cif:'CIF-1005388', nm:'Silverline Hospitality Pvt Ltd',prod:'Term loan — 84m',         cur:'INR', bal:-221507400.00,st:'Active',  br:'PNQ-011', open:'2021-08-19' },
    { no:'SB 4021 5566 3301', cif:'CIF-1007712', nm:'Meera Krishnan',              prod:'Savings — Regular',         cur:'INR', bal:    31200.00, st:'Restricted', br:'MAA-021', open:'2026-08-24' },
    { no:'SB 4021 1188 9902', cif:'CIF-1002119', nm:'Vasanth R. Menon',            prod:'Savings — Salary',          cur:'INR', bal:   287410.10, st:'Dormant', br:'BLR-014', open:'2013-05-30' }
  ];

  const statement = {
    'SB 4021 0099 1187':[
      { d:'30-Aug-2026', ref:'UPI/226421187', nar:'UPI — Blue Tokai Coffee',          dr:  418.00, cr:0,        bal:1842660.40 },
      { d:'29-Aug-2026', ref:'NEFT/N2608291', nar:'Salary credit — Northgate Logistics', dr:0,     cr:412000.00, bal:1843078.40 },
      { d:'28-Aug-2026', ref:'ACH/D8829110',  nar:'ACH debit — LIC premium',          dr:24800.00, cr:0,        bal:1431078.40 },
      { d:'27-Aug-2026', ref:'ATM/BLR01429',  nar:'ATM cash withdrawal — Koramangala',dr:10000.00, cr:0,        bal:1455878.40 },
      { d:'26-Aug-2026', ref:'INT/Q2-2026',   nar:'Quarterly savings interest',       dr:0,        cr:  9114.22, bal:1465878.40 },
      { d:'24-Aug-2026', ref:'IMPS/8841002',  nar:'IMPS transfer to M. Krishnan',     dr:15000.00, cr:0,        bal:1456764.18 }
    ]
  };

  /* ------------------------------------------------------------- ledger */
  // Double-entry journal. Each entry carries prev-hash → hash (illustrative).
  const journal = [
    { ref:'JV-2026-08-30-00417', ts:'30-Aug-2026 14:22:09 IST', nar:'Customer NEFT outward — Harbourline Exports', src:'Payments Hub',
      prev:'9f2c41ab7de08c5510b3', hash:'a71d0e93bb4c2f8617ae',
      legs:[ {ac:'21001', nm:'Customer deposits — current', dr:12500000, cr:0},
             {ac:'71204', nm:'NEFT outward clearing',       dr:0, cr:12494750},
             {ac:'40110', nm:'Fee income — remittance',     dr:0, cr:5250} ] },
    { ref:'JV-2026-08-30-00416', ts:'30-Aug-2026 13:58:41 IST', nar:'Term deposit interest accrual — batch 08', src:'Deposits Engine',
      prev:'6b81ff20a9c4d3e7150f', hash:'9f2c41ab7de08c5510b3',
      legs:[ {ac:'50210', nm:'Interest expense — term deposits', dr:8842119, cr:0},
             {ac:'21440', nm:'Interest payable — term deposits', dr:0, cr:8842119} ] },
    { ref:'JV-2026-08-30-00415', ts:'30-Aug-2026 13:31:07 IST', nar:'Loan disbursement — Silverline Hospitality', src:'Lending',
      prev:'2ac7509e1f8b6d40e9cc', hash:'6b81ff20a9c4d3e7150f',
      legs:[ {ac:'13020', nm:'Term loans — corporate',   dr:35000000, cr:0},
             {ac:'21001', nm:'Customer deposits — current', dr:0, cr:34650000},
             {ac:'40140', nm:'Processing fee income',    dr:0, cr:350000} ] },
    { ref:'JV-2026-08-30-00414', ts:'30-Aug-2026 12:04:55 IST', nar:'Cash receipt — branch MUM-002 teller 04', src:'Branch Teller',
      prev:'c3e9a1470bd25f8813aa', hash:'2ac7509e1f8b6d40e9cc',
      legs:[ {ac:'11010', nm:'Cash in hand — branch', dr:1450000, cr:0},
             {ac:'21001', nm:'Customer deposits — current', dr:0, cr:1450000} ] },
    { ref:'JV-2026-08-30-00413', ts:'30-Aug-2026 11:47:12 IST', nar:'REVERSAL of JV-2026-08-30-00409 — duplicate posting', src:'Finance · Adjustment',
      prev:'55d0b8e2907fa14c6be3', hash:'c3e9a1470bd25f8813aa', rev:true,
      legs:[ {ac:'71104', nm:'Suspense — inward', dr:0, cr:298400},
             {ac:'21001', nm:'Customer deposits — current', dr:298400, cr:0} ] },
    { ref:'JV-2026-08-30-00412', ts:'30-Aug-2026 10:12:38 IST', nar:'Card interchange settlement — network batch', src:'Cards',
      prev:'e08fc6b3d5219a740172', hash:'55d0b8e2907fa14c6be3',
      legs:[ {ac:'11220', nm:'Nostro — settlement bank', dr:6210455, cr:0},
             {ac:'40320', nm:'Interchange income',       dr:0, cr:6210455} ] }
  ];

  /* ----------------------------------------------------------- payments */
  const payments = [
    { id:'PAY-2026-0083311', rail:'RTGS',  ccy:'INR', amt:  42500000, ben:'Northgate Logistics Ltd', bank:'HDFC0000123', maker:'OPS.SDESAI',  made:'30-Aug 14:41', st:'Pending approval', risk:'Above dealer limit — requires senior approval' },
    { id:'PAY-2026-0083310', rail:'NEFT',  ccy:'INR', amt:   1875000, ben:'Aruna Textiles LLP',      bank:'ICIC0000455', maker:'OPS.RMENON',  made:'30-Aug 14:33', st:'Pending approval', risk:'Maker is current operator — segregation of duties blocks self-approval' },
    { id:'PAY-2026-0083309', rail:'SWIFT', ccy:'USD', amt:    318400, ben:'Meridian Trade Finance SG',bank:'DBSSSGSG',   maker:'OPS.SDESAI',  made:'30-Aug 13:58', st:'Pending approval', risk:'Cross-border — sanctions screening cleared 13:58' },
    { id:'PAY-2026-0083308', rail:'IMPS',  ccy:'INR', amt:     45000, ben:'M. Krishnan',             bank:'SBIN0001122', maker:'BR.MAA021',   made:'30-Aug 13:22', st:'Approved',        risk:'—' },
    { id:'PAY-2026-0083307', rail:'NEFT',  ccy:'INR', amt:  12500000, ben:'Harbourline Exports Pvt Ltd', bank:'AXIS0000901', maker:'OPS.SDESAI', made:'30-Aug 12:15', st:'Settled', risk:'—' },
    { id:'PAY-2026-0083306', rail:'RTGS',  ccy:'INR', amt:   8200000, ben:'Coastal Freight Services',bank:'KKBK0000345', maker:'OPS.NRAO',    made:'30-Aug 11:40', st:'Rejected',        risk:'Beneficiary account name mismatch' }
  ];

  /* ------------------------------------------------------ financial close */
  // Balanced trial balance, in INR. Debit total === credit total (asserted below).
  // Deposits and advances here reconcile to the KPI tiles:
  //   deposits  88,024 + 132,032 + 282,344 Cr-equivalent = ₹50,240 Cr
  //   advances  214,880,000,000 + 164,520,000,000        = ₹37,940 Cr
  //   CASA      (88,024 + 132,032) / 502,400             = 43.8%
  const trialBalance = [
    { ac:'11010', nm:'Cash in hand',                   dr:   8412000000, cr:0 },
    { ac:'11220', nm:'Nostro accounts',                dr:  22186500000, cr:0 },
    { ac:'13020', nm:'Term loans — corporate',         dr: 214880000000, cr:0 },
    { ac:'13040', nm:'Working capital facilities',     dr: 164520000000, cr:0 },
    { ac:'15010', nm:'Investments — held to maturity', dr: 118240000000, cr:0 },
    { ac:'18010', nm:'Property, plant & equipment',    dr:   3940000000, cr:0 },
    { ac:'21001', nm:'Customer deposits — current',    dr:0, cr:  88024000000 },
    { ac:'21200', nm:'Customer deposits — savings',    dr:0, cr: 132032000000 },
    { ac:'21400', nm:'Term deposits',                  dr:0, cr: 282344000000 },
    { ac:'21440', nm:'Interest payable',               dr:0, cr:   4218400000 },
    { ac:'21900', nm:'Other liabilities & provisions', dr:0, cr:   2860000000 },
    { ac:'31000', nm:'Share capital & reserves',       dr:0, cr:  21620100000 },
    { ac:'40010', nm:'Interest income',                dr:0, cr:  28410600000 },
    { ac:'40110', nm:'Fee & commission income',        dr:0, cr:   3184200000 },
    { ac:'40320', nm:'Interchange income',             dr:0, cr:    918600000 },
    { ac:'40510', nm:'Treasury & trading income',      dr:0, cr:   1240000000 },
    { ac:'50210', nm:'Interest expense',               dr:  18402900000, cr:0 },
    { ac:'50400', nm:'Operating expenses',             dr:   9860500000, cr:0 },
    { ac:'50700', nm:'Provisions & write-offs',        dr:   4410000000, cr:0 }
  ];

  const closeTasks = [
    { t:'Freeze sub-ledger posting for period',            own:'Finance Ops', done:true,  ev:2 },
    { t:'Run interest accrual — deposits',                 own:'Deposits',    done:true,  ev:1 },
    { t:'Run interest accrual — advances',                 own:'Lending',     done:true,  ev:1 },
    { t:'Nostro reconciliation — all correspondents',      own:'Recon',       done:true,  ev:4 },
    { t:'Card network settlement reconciliation',          own:'Cards',       done:true,  ev:2 },
    { t:'Suspense account clearance',                      own:'Finance Ops', done:false, ev:0 },
    { t:'Fixed asset depreciation run',                    own:'Finance',     done:true,  ev:1 },
    { t:'Expected credit loss / provisioning run',         own:'Risk',        done:false, ev:1 },
    { t:'FX revaluation — monetary assets & liabilities',  own:'Treasury',    done:true,  ev:2 },
    { t:'Inter-branch reconciliation',                     own:'Finance Ops', done:true,  ev:1 },
    { t:'Trial balance review & variance commentary',      own:'Controller',  done:false, ev:0 },
    { t:'Regulatory return preparation',                   own:'Compliance',  done:false, ev:0 },
    { t:'Controller sign-off',                             own:'Controller',  done:false, ev:0 },
    { t:'CFO sign-off',                                    own:'CFO',         done:false, ev:0 }
  ];

  /* -------------------------------------------------------------- audit */
  const audit = [
    { ts:'30-Aug-2026 14:41:52', who:'OPS.SDESAI', act:'PAYMENT.CREATE',  obj:'PAY-2026-0083311', ip:'10.20.4.61',  res:'OK' },
    { ts:'30-Aug-2026 14:22:09', who:'SYS.LEDGER', act:'JOURNAL.POST',    obj:'JV-2026-08-30-00417', ip:'—',        res:'OK' },
    { ts:'30-Aug-2026 14:03:11', who:'OPS.RMENON', act:'AUTH.MFA.SUCCESS',obj:'session 8f21ac',   ip:'10.20.4.44',  res:'OK' },
    { ts:'30-Aug-2026 13:59:47', who:'OPS.RMENON', act:'AUTH.MFA.FAIL',   obj:'session 8f21ac',   ip:'10.20.4.44',  res:'DENIED' },
    { ts:'30-Aug-2026 13:47:02', who:'FCC.APILLAI',act:'CUSTOMER.RISK.CHANGE', obj:'CIF-1004821', ip:'10.20.7.12',  res:'OK' },
    { ts:'30-Aug-2026 12:31:20', who:'ADM.KJOSHI', act:'ROLE.GRANT',      obj:'OPS.NRAO → Payments Maker', ip:'10.20.1.9', res:'OK' },
    { ts:'30-Aug-2026 11:47:12', who:'FIN.DSHAH',  act:'JOURNAL.REVERSE', obj:'JV-2026-08-30-00409', ip:'10.20.6.33', res:'OK' },
    { ts:'30-Aug-2026 09:02:44', who:'SYS.BATCH',  act:'EOD.PREVIOUS.CLOSE', obj:'29-Aug-2026',   ip:'—',           res:'OK' }
  ];

  const roles = [
    { r:'Teller',            perms:['Cash in/out','Account enquiry','Cheque deposit'], mfa:'TOTP', users:412, limit:'₹2,00,000 / txn' },
    { r:'Branch Manager',    perms:['Teller rights','Override','Account opening approval'], mfa:'TOTP + device', users:78, limit:'₹25,00,000 / txn' },
    { r:'Payments Maker',    perms:['Create payment','Amend before approval'], mfa:'TOTP', users:64, limit:'No release rights' },
    { r:'Payments Checker',  perms:['Approve / reject payment'], mfa:'TOTP + device', users:22, limit:'₹5,00,00,000 / txn' },
    { r:'Operations Manager',perms:['Exception queue','Reporting','Read all'], mfa:'TOTP + device', users:31, limit:'Read + workflow' },
    { r:'Controller',        perms:['Journal post','Period close','Sign-off'], mfa:'TOTP + device', users:9, limit:'4-eyes on all postings' },
    { r:'Compliance / FCC',  perms:['AML disposition','Sanctions review','SAR filing'], mfa:'TOTP + device', users:18, limit:'Segregated from ops' },
    { r:'System Admin',      perms:['Role grant','Config'], mfa:'TOTP + device + break-glass', users:5, limit:'No financial rights' }
  ];

  const controls = [
    { c:'Data at rest',        s:'AES-256, keys in HSM (FIPS 140-2 Level 3)', ok:true },
    { c:'Data in transit',     s:'TLS 1.3, mTLS between services', ok:true },
    { c:'Key management',      s:'HSM-backed, annual rotation, split custody', ok:true },
    { c:'Authentication',      s:'Password + TOTP; device binding on privileged roles', ok:true },
    { c:'Privileged access',   s:'Break-glass with dual approval and session recording', ok:true },
    { c:'Segregation of duties',s:'Maker-checker enforced on payments, journals, static data', ok:true },
    { c:'Audit trail',         s:'Append-only, hash-chained, retained per policy', ok:true },
    { c:'Card data scope',     s:'PCI DSS — PAN tokenised, CDE network-isolated', ok:true },
    { c:'Backup & DR',         s:'RPO 15 min · RTO 2 h · quarterly failover test', ok:true },
    { c:'Penetration testing', s:'Next external test due — not yet scheduled', ok:false }
  ];

  return { months, deposits, advances, kpis, exceptions, customers, accounts,
           statement, journal, payments, trialBalance, closeTasks, audit, roles, controls };
})();
