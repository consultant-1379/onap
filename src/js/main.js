let retrievedAlarms = [];
const selectedDomains = new Set(['FAULT', 'HEARTBEAT', 'MEASUREMENTSFORVFSCALING', 'MOBILEFLOW', 'OTHER',
                                 'SIPSIGNALING', 'STATECHANGE', 'SYSLOG', 'THRESHOLDCROSSINGALERT', 'VOICEQUALITY']);

const datatable = $('#table').DataTable({
  'oLanguage': {
    'sLengthMenu': 'Show records _MENU_',
  },
  // http://legacy.datatables.net/usage/options for sDom definition/description
  'sDom': '<"row"l<"refresh-rate"><"time-range">f>'+
          'rt'+
          'ip',
  'data': [
    {
      commonEventHeader: {
        sourceName: 'vMME',
        eventType: 'No License',
        timeStamp: '2008/10/16 09:32:12',
        domain: 'Fault',
      },
      faultFields: {
        eventSeverity: 'MINOR',
      },
    },
  ],
  'columns': [{
    'title': 'Time',
    'data': 'commonEventHeader.startEpochMicrosec',
    'render': data => moment(data/1000).format('YYYY/MM/DD HH:mm:ss.SSS'),
  }, {
    'title': 'Source',
    'data': 'commonEventHeader.sourceName',
  }, {
    'title': 'Domain',
    'data': 'commonEventHeader.domain',
  }],
  'order': [[0, 'desc']],
  'createdRow': (row, data) => {
    $(row).addClass(data.commonEventHeader.domain.toLowerCase());
  },
});

$('div.refresh-rate').html(`
    <label>
      Refresh Rate:
      <input type="number" id="rate" placeholder="_ (seconds)" min="0" max="120"/>
    </label>
  `);

$('div.time-range').html(`
    <label class="time-input">
      From:
      <input type="text" id="min" placeholder="" onchange="updateTimeRangeIfValid()"/>
    </label>
    <label class="time-input">
      To:
      <input type="text" id="max" placeholder="" onchange="updateTimeRangeIfValid()"/>
    </label>
  `);

$('#min').datetimepicker();
$('#max').datetimepicker();

$.fn.dataTable.ext.search.push((_, data) => {
    const min = moment($('#min').val());
    const max = moment($('#max').val());
    const time = moment(data[0]);

    return (isNaN(min) && isNaN(max)) ||
        (isNaN(min) && time.isBefore(max)) ||
        (time.isAfter(min) && isNaN(max)) ||
        moment(data[0]).isBetween(min, max);
});

function updateRefreshRateIfValid() {
  const rate = $('#rate').val();
  if (rate != '' && rate >0) {
    refreshRate = Math.floor(rate)*1000;
  } else {
    clearInterval();
    refreshRate = 0;
  }
}

function refresh() {
    updateRefreshRateIfValid();
    if (refreshRate != 0) {
      setTimeout(getAndShowAlarms, refreshRate);
    } else {
      setTimeout(refresh, 1000);
    }
    refreshTime = 0;
}

function updateTimeRangeIfValid() {
  const min = $('#min').val();
  const max = $('#max').val();
  if ((min === '' || moment(min).isValid()) &&
      (max === '' || moment(max).isValid())) {
      datatable.draw();
  }
}

$('#min').keyup(updateTimeRangeIfValid);
$('#max').keyup(updateTimeRangeIfValid);

$('table').on('click', '.headerFields', function() {
  let table = $(this).closest('table');
  let tbodys = table.children('tbody');
  let headerRow = table.children().next('tbody.layerStart');
  let row = table.children('tbody:first');
  let layerLevel = 0;

  if ($(this).css('background-color') == 'rgb(255, 255, 255)') {
    tbodys.hide();
    $(this).css('background-color', 'rgb(245, 245, 245)');
  } else if ($(this).css('background-color') == 'rgb(245, 245, 245)') {
    tbodys.show();
    for (let i=0; i<tbodys.length; i++) {
      if (layerLevel>0) {
        row.hide();
      }
      if (row.hasClass('layerStart')) {
        layerLevel+=1;
      }
      if (row.hasClass('layerStop')) {
        layerLevel-=1;
      }
      row = row.next('tbody');
    }
    $(this).css('background-color', 'rgb(255, 255, 255)');
  }

  for (let i=0; i<tbodys.length; i++) {
    headerRow.children().css('background-color', 'rgb(225, 235, 245)');
    headerRow = headerRow.next('tbody.layerStart');
  }
});

$('table').on('click', '.layerFieldStart', function() {
  let table = $(this).closest('table');
  let tbodys = table.children('tbody');
  let row = $(this).closest('tbody');
  let layerLevel=0;

  if ($(this).css('background-color') == 'rgb(242, 242, 242)') {
    $(this).css('background-color', 'rgb(225, 235, 245)');
  } else if ($(this).css('background-color') == 'rgb(225, 235, 245)') {
    $(this).css('background-color', 'rgb(242, 242, 242)');
  }

  for (let i=0; i<tbodys.length; i++) {
    if (row.hasClass('layerStart')) {
      layerLevel+=1;
    }
    if (row.hasClass('layerStop')) {
      layerLevel-=1;
    }
    if (layerLevel == 0) {
      break;
    }

    row = row.next('tbody');
    if ($(this).css('background-color') == 'rgb(242, 242, 242)') {
      if (row.hasClass('layerStart')) {
        row.children().css('background-color', 'rgb(242, 242, 242)');
      }
      row.children().addClass('indent'+layerLevel);
      row.show();
    } else if ($(this).css('background-color') == 'rgb(225, 235, 245)') {
      row.children().removeClass('indent'+layerLevel);
      row.hide();
    }
  }
});

$('#table tbody').on('click', 'td', function() {
  const tr = $(this).closest('tr');
  const row = datatable.row(tr);
  if (row.child.isShown()) {
    row.child.hide();
    tr.removeClass('shown');
  } else {
    row.child(format(row.data())).show();
    tr.addClass('shown');
  }
});

window.onload = getAndShowAlarms;

function getAndShowAlarms() {
  axios.get('proxy/api/vesEvents')
    .then(response => response.data)
    .then(formatAlarms)
    .then(alarms => {
      retrievedAlarms = alarms;
      return alarms;
    })
    .then(renderAlarmCount)
    .then(filterAlarms)
    .then(renderAlarms)
    .catch(console.error);
  refresh();
}

function formatAlarms(alarms) {
  return alarms
    .map(alarm => JSON.parse(alarm).event)
    .map(alarm => {
    return alarm;
  });
}

function renderAlarmCount(alarms) {
  const alarmCounts = countAlarms(alarms);
  for (const [domain, count] of Object.entries(alarmCounts)) {
    document.getElementById(`${domain.toLowerCase()}-count`).innerHTML = `(${count})`;
  }
  return alarms;
}

function filterAlarms(alarms) {
  return alarms.filter(alarm => selectedDomains.has(alarm.commonEventHeader.domain.toUpperCase()));
}

function renderAlarms(alarms) {
  datatable.clear();
  datatable.rows.add(alarms);
  datatable.draw();

  const newestDate = new Date(Math.min(...alarms.map(alarm => alarm.commonEventHeader.startEpochMicrosec)));
  if (moment(newestDate).isValid()) {
    $('#min').attr('placeholder', moment(newestDate/1000).format('YYYY/MM/DD HH:mm:ss'));
  }
  const oldestDate = new Date(Math.max(...alarms.map(alarm => alarm.commonEventHeader.startEpochMicrosec)));
  if (moment(oldestDate).isValid()) {
    $('#max').attr('placeholder', moment(oldestDate/1000).format('YYYY/MM/DD HH:mm:ss'));
  }

  document.getElementById('loading-spinner').style.display = 'none';
}

function format(alarm) {
  return Handlebars.templates['alarm-info'](alarm);
}

function countAlarms(alarms) {
  const alarmCounts = {
    FAULT: 0,
    HEARTBEAT: 0,
    MEASUREMENTSFORVFSCALING: 0,
    MOBILEFLOW: 0,
    OTHER: 0,
    SIPSIGNALING: 0,
    STATECHANGE: 0,
    SYSLOG: 0,
    THRESHOLDCROSSINGALERT: 0,
    VOICEQUALITY: 0,
  };

  alarms.forEach(alarm => {
    ++alarmCounts[alarm.commonEventHeader.domain.toUpperCase()];
  });
  return alarmCounts;
}

// eslint-disable-next-line no-unused-vars
function handleDomainClick(element) {
  if (!element.id || element.id.indexOf('-label') >= 0) {
    return;
  }

  const domain = element.id.toUpperCase();

  if (selectedDomains.has(domain)) {
    document.getElementById(`${element.id}-label`).classList.add('checkbox-unselected');
    selectedDomains.delete(domain);
  } else {
    document.getElementById(`${element.id}-label`).classList.remove('checkbox-unselected');
    selectedDomains.add(domain);
  }

  renderAlarms(filterAlarms(retrievedAlarms));
}

// eslint-disable-next-line no-unused-vars
function handleDomainDoubleClick(domainLabel) {
  const clickedDomain = domainLabel.replace('-label', '').toUpperCase();

  if (selectedDomains.size === 1 && selectedDomains.has(clickedDomain)) {
    addAllDomains();
  } else {
    selectOneDomain(domainLabel);
  }

  renderAlarms(filterAlarms(retrievedAlarms));
}

function addAllDomains() {
  ['CRITICAL', 'MINOR', 'WARNING'].forEach(domain => {
    document.getElementById(`${domain.toLowerCase()}-label`).classList.remove('checkbox-unselected');
    selectedDomains.add(domain);
  });
}

function selectOneDomain(domainLabel) {
  selectedDomains.forEach(domain => {
    document.getElementById(`${domain.toLowerCase()}-label`).classList.add('checkbox-unselected');
    selectedDomains.delete(domain);
  });

  document.getElementById(domainLabel).classList.remove('checkbox-unselected');
  selectedDomains.add(domainLabel.replace('-label', '').toUpperCase());
}
