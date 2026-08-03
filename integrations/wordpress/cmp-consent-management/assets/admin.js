(function ($) {
  function showResult(data) {
    const el = document.getElementById('cmp-action-result');
    if (!el) return;
    el.hidden = false;
    el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }

  $('#cmp-test-connection').on('click', function () {
    $.post(cmpCmAdmin.ajaxUrl, {
      action: 'cmp_test_connection',
      nonce: cmpCmAdmin.nonce,
    })
      .done(function (res) {
        if (!res.success) {
          showResult(res.data?.message || 'Connection failed');
          return;
        }
        const items = res.data?.domains?.items || res.data?.items || [];
        const picker = document.getElementById('cmp-domain-picker');
        if (!picker) return;
        picker.innerHTML = '';
        items.forEach(function (domain) {
          const opt = document.createElement('option');
          opt.value = domain.id;
          opt.textContent = domain.hostname + ' (' + domain.domainKey + ')';
          opt.dataset.domainKey = domain.domainKey;
          picker.appendChild(opt);
        });
        picker.onchange = function () {
          const selected = picker.options[picker.selectedIndex];
          document.getElementById('cmp_domain_id').value = selected.value;
          document.getElementById('cmp_domain_key').value = selected.dataset.domainKey || '';
        };
        showResult('Loaded ' + items.length + ' domain(s). Select from dropdown.');
      })
      .fail(function () {
        showResult('Connection request failed');
      });
  });

  $('#cmp-validate-install').on('click', function () {
    $.post(cmpCmAdmin.ajaxUrl, {
      action: 'cmp_validate_installation',
      nonce: cmpCmAdmin.nonce,
    })
      .done(function (res) {
        showResult(res.success ? res.data : res.data?.message || 'Validation failed');
      })
      .fail(function () {
        showResult('Validation request failed');
      });
  });

  $('#cmp-start-scan').on('click', function () {
    $.post(cmpCmAdmin.ajaxUrl, {
      action: 'cmp_start_scan',
      nonce: cmpCmAdmin.nonce,
      start_url: window.location.origin + '/',
    })
      .done(function (res) {
        showResult(res.success ? res.data : res.data?.message || 'Scan failed');
      })
      .fail(function () {
        showResult('Scan request failed');
      });
  });
})(jQuery);
