(function(){
  "use strict";
  var MIN = 130, MAX = 349;
  var state = {}; // number -> {takenBy, takenAt}
  var db = null;
  var claimTarget = null; // number currently in the modal
  var autoMode = false;

  var grid = document.getElementById('grid');
  var cells = {};

  function buildGrid(){
    var frag = document.createDocumentFragment();
    for(var n = MIN; n <= MAX; n++){
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('data-n', n);
      var num = document.createElement('span');
      num.className = 'num';
      num.textContent = n;
      cell.appendChild(num);
      var tip = document.createElement('span');
      tip.className = 'tip';
      tip.textContent = '';
      cell.appendChild(tip);
      cell.addEventListener('click', onCellClick);
      frag.appendChild(cell);
      cells[n] = { el: cell, num: num, tip: tip };
    }
    grid.appendChild(frag);
  }

  function render(){
    var availCount = 0, takenCount = 0;
    var next = lowestAvailable();
    for(var n = MIN; n <= MAX; n++){
      var rec = state[n];
      var c = cells[n];
      if(rec){
        takenCount++;
        c.el.classList.add('taken');
        c.el.classList.remove('locked', 'next');
        var when = '';
        try{ if(rec.takenAt) when = rec.takenAt.toDate().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}); }catch(e){}
        c.tip.textContent = (rec.takenBy || 'alguém') + (when ? (' · ' + when) : ' · agora mesmo') + ' · clique para liberar';
      } else {
        availCount++;
        c.el.classList.remove('taken');
        if(n === next){
          c.el.classList.remove('locked');
          c.el.classList.add('next');
          c.tip.textContent = '';
        } else {
          c.el.classList.add('locked');
          c.el.classList.remove('next');
          c.tip.textContent = 'Reserve em ordem — pegue o ' + next + ' primeiro';
        }
      }
    }
    document.getElementById('statAvail').textContent = availCount;
    document.getElementById('statTaken').textContent = takenCount;
  }

  function lowestAvailable(){
    for(var n = MIN; n <= MAX; n++){ if(!state[n]) return n; }
    return null;
  }

  function onCellClick(e){
    var n = parseInt(e.currentTarget.getAttribute('data-n'), 10);
    if(!db){ return; }
    if(state[n]){
      releaseFlow(n);
    } else if(n !== lowestAvailable()){
      alert('As requisições são reservadas em ordem. Pegue o número ' + lowestAvailable() + ' primeiro.');
    } else {
      autoMode = false;
      openModal(n);
    }
  }

  document.getElementById('btnNext').addEventListener('click', function(){
    if(!db) return;
    var n = lowestAvailable();
    if(n === null){ alert('Não há números disponíveis no momento.'); return; }
    autoMode = true;
    openModal(n);
  });

  // ---------- Modal ----------
  var overlay = document.getElementById('overlay');
  var formView = document.getElementById('formView');
  var successView = document.getElementById('successView');
  var modalMsg = document.getElementById('modalMsg');
  var nameInput = document.getElementById('nameInput');

  function getSavedName(){ try{ return localStorage.getItem('rmo_name') || ''; }catch(e){ return ''; } }
  function saveName(n){ try{ localStorage.setItem('rmo_name', n); }catch(e){} }

  function openModal(n){
    claimTarget = n;
    document.getElementById('modalNumLabel').textContent = 'NÚMERO ' + n;
    document.getElementById('modalTitle').textContent = 'Confirmar requisição';
    modalMsg.className = 'msg';
    modalMsg.textContent = '';
    nameInput.value = getSavedName();
    formView.style.display = '';
    successView.style.display = 'none';
    overlay.hidden = false;
    setTimeout(function(){ nameInput.focus(); nameInput.select(); }, 30);
  }
  function closeModal(){
    overlay.hidden = true;
    claimTarget = null;
  }
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnDone').addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
  nameInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') confirmClaim(); });

  function showMsg(text, kind){
    modalMsg.textContent = text;
    modalMsg.className = 'msg show ' + kind;
  }

  document.getElementById('btnConfirm').addEventListener('click', confirmClaim);

  function confirmClaim(){
    var name = nameInput.value.trim();
    if(!name){ showMsg('Digite seu nome para confirmar.', 'error'); nameInput.focus(); return; }
    if(!db){ showMsg('Sem conexão com o banco compartilhado.', 'error'); return; }
    saveName(name);
    var n = claimTarget;
    var btn = document.getElementById('btnConfirm');
    btn.disabled = true;
    btn.textContent = 'Reservando…';
    attemptClaim(n, name, 0, btn);
  }

  function attemptClaim(n, name, tries, btn){
    claimNumber(n, name).then(function(){
      btn.disabled = false;
      btn.textContent = 'Confirmar';
      document.getElementById('successNum').textContent = n;
      formView.style.display = 'none';
      successView.style.display = '';
      // local snapshot listener will bring the authoritative record shortly;
      // reflect it immediately so the UI doesn't flicker back to "available".
      state[n] = { takenBy: name, takenAt: null };
      render();
    }).catch(function(err){
      if(err && err.code === 'taken'){
        return handleBusy(n, name, tries, btn);
      }
      btn.disabled = false;
      btn.textContent = 'Confirmar';
      showMsg('Não deu para reservar agora. Tente de novo em instantes.', 'error');
    });
  }

  function claimNumber(n, name){
    var ref = db.collection('requests').doc(String(n));
    return db.runTransaction(function(t){
      return t.get(ref).then(function(doc){
        if(doc.exists){ var e = new Error('taken'); e.code = 'taken'; throw e; }
        t.set(ref, {
          takenBy: name,
          takenAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    });
  }

  function handleBusy(n, name, tries, btn){
    if(autoMode && tries < 8){
      var next = null;
      for(var k = n + 1; k <= MAX; k++){ if(!state[k]){ next = k; break; } }
      if(next !== null){
        claimTarget = next;
        document.getElementById('modalNumLabel').textContent = 'NÚMERO ' + next;
        return attemptClaim(next, name, tries + 1, btn);
      }
    }
    btn.disabled = false;
    btn.textContent = 'Confirmar';
    showMsg('Esse número acabou de ser reservado por outra pessoa. Escolha outro na lista.', 'error');
  }

  // ---------- Release ----------
  function releaseFlow(n){
    var rec = state[n];
    var who = rec ? (rec.takenBy || 'alguém') : '';
    var ok = window.confirm('Liberar o número ' + n + '? Ele voltará para a lista de disponíveis.\n\nReservado por: ' + who);
    if(!ok) return;
    db.collection('requests').doc(String(n)).delete().then(function(){
      delete state[n];
      render();
    }).catch(function(){
      alert('Não deu para liberar agora. Tente de novo em instantes.');
    });
  }

  // ---------- Boot ----------
  buildGrid();
  render();

  var cfg = window.FIREBASE_CONFIG;
  var notConfigured = !cfg || cfg.apiKey === 'COLE_AQUI' || !cfg.apiKey;
  if(notConfigured){
    document.getElementById('setupBanner').classList.add('show');
    document.getElementById('btnNext').disabled = true;
  } else {
    try{
      firebase.initializeApp(cfg);
      db = firebase.firestore();
      db.collection('requests').onSnapshot(function(qs){
        var next = {};
        qs.forEach(function(doc){
          var d = doc.data();
          next[doc.id] = { takenBy: d.takenBy, takenAt: d.takenAt || null };
        });
        state = next;
        render();
      }, function(){
        document.getElementById('offlineBanner').classList.add('show');
      });
    }catch(e){
      document.getElementById('offlineBanner').classList.add('show');
      document.getElementById('btnNext').disabled = true;
    }
  }
})();
