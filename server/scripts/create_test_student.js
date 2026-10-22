(async () => {
  const fetch = globalThis.fetch || (async (...args) => { const {default: f} = await import('node-fetch'); return f(...args); });
  const base = 'http://localhost:5000';
  try {
    const login = await fetch(base + '/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: 'admin@gmail.com', password: 'admin'})});
    const L = await login.json();
    if (!L.success) { console.error('Login failed', L); process.exit(1); }
    const token = L.data.accessToken || L.data.token;
    console.log('token ok');

    const classesRes = await fetch(base + '/api/classes', { headers: { 'Authorization': 'Bearer ' + token } });
    const classes = await classesRes.json();
    const classId = classes.data && classes.data[0] && classes.data[0]._id;

    const sectionsRes = await fetch(base + '/api/sections', { headers: { 'Authorization': 'Bearer ' + token } });
    const secs = await sectionsRes.json();
    let sectionId = null;
    if (secs.data && secs.data.length) {
      sectionId = secs.data.find(s => s.class == classId)? secs.data.find(s => s.class == classId)._id : secs.data[0]._id;
    }

    const feeRes = await fetch(base + '/api/fee-structures', { headers: { 'Authorization': 'Bearer ' + token } });
    const feeList = await feeRes.json();
    const feeId = feeList.data && feeList.data[0] && feeList.data[0]._id;

    if (!classId || !sectionId || !feeId) {
      console.error('Missing ids:', { classId, sectionId, feeId });
      process.exit(1);
    }

    const create = await fetch(base + '/api/students', { method: 'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({ firstName: 'APITest', lastName: 'Student', admissionNumber: 'API-0001', gender: 'Male', birthDate: '2010-01-01', classId, sectionId, phoneNumber: '061000000', address: 'Nowhere', parentName: 'Parent', parentPhoneNumber: '061000000' }) });
    const created = await create.json();
    console.log('create status', create.status, JSON.stringify(created, null, 2));
    const studentId = created.data && created.data._id;
    if (!studentId) { console.error('Failed to create student'); process.exit(1); }

    const post = await fetch(base + '/api/student-invoices', { method: 'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({ invoice_no: 'INV-API-1', student: studentId, fee_struc_no: feeId }) });
    const pj = await post.json();
    console.log('invoice status', post.status, JSON.stringify(pj, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
