'use strict'

const appInsights = require('applicationinsights')
const test = require('tap').test
const tested = require('../src/applicationinsights')
const sinon = require('sinon')

test('creates client', t => {
  const client = new tested.Client({ key: 'blablabla' })
  t.ok(Object.prototype.hasOwnProperty.call(client, 'insights'))
  t.end()
})

test('gets exception from log', t => {
  const input = [
    { level: 10, time: 1532081790710, msg: 'trace message' },
    { level: 50, time: 1532081790750, msg: 'error message', pid: 9118, hostname: 'MacBook-Pro.local', type: 'Error', stack: 'Error: error message', v: 1 },
    { level: 50, time: 1532081790751, msg: 'error message', pid: 9118, type: 'Error' }
  ]
  const client = new tested.Client()
  const output = input.map(log => client.getLogException(log))
  t.equals(output[0], undefined)
  t.equals(output[1].message, 'error message')
  t.equals(output[2].stack, '')
  t.end()
})

test('gets message from log', t => {
  const input = [
    { level: 10, time: 1532081790710, msg: 'trace message' },
    { level: 20, time: 1532081790720 }
  ]
  const client = new tested.Client()
  const output = input.map(log => client.getLogMessage(log))
  t.deepEqual(output, ['trace message', 'Verbose'])
  t.end()
})

test('gets properties from log', t => {
  const input = [
    { level: 10, time: 1532081790710, msg: 'trace message' },
    { level: 20, time: 1532081790720, pid: 23164 }
  ]
  const client = new tested.Client()
  const output = input.map(log => client.getLogProperties(log))
  t.deepEqual(output, [{ level: 10, time: 1532081790710 }, { level: 20, time: 1532081790720, pid: 23164 }])
  t.end()
})

test('converts severity level', t => {
  const input = [10, 20, 30, 40, 50, 60, 99]
  const client = new tested.Client()
  const output = input.map(level => client.getLogSeverity(level))
  t.deepEqual(output, [0, 0, 1, 2, 3, 4, 1])
  t.end()
})

test('gets severity name', t => {
  const input = [0, 1, 2, 3, 4]
  const client = new tested.Client()
  const output = input.map(level => client.getLogSeverityName(level))
  t.deepEqual(output, ['Verbose', 'Information', 'Warning', 'Error', 'Critical'])
  t.end()
})

test('inserts trace', t => {
  const input = { level: 30, time: 1532081790730, msg: 'info message', pid: 9118 }
  const client = new tested.Client()
  const stubTrace = sinon.stub(appInsights.defaultClient, 'trackTrace').callsFake(telemetry => {
    t.deepEqual(telemetry, { message: 'info message', severity: 1, properties: { level: 30, time: 1532081790730, pid: 9118 } })
  })
  client.insertTrace(input)
  stubTrace.restore()
  t.end()
})

test('inserts exception', t => {
  const input = { level: 50, time: 1532081790750, msg: 'error message', pid: 9118, hostname: 'MacBook-Pro.local', type: 'Error', stack: 'Error: error message', v: 1 }
  const client = new tested.Client()
  const stubException = sinon.stub(appInsights.defaultClient, 'trackException').callsFake(telemetry => {
    t.equals(telemetry.exception.message, 'error message')
    t.equals(telemetry.properties.level, 50)
  })
  client.insertException(input)
  stubException.restore()
  t.end()
})

test('does not insert malformed exception', t => {
  const input = { level: 30, time: 1532081790750, msg: 'error message', pid: 9118, hostname: 'MacBook-Pro.local', type: 'Error', stack: 'Error: error message', v: 1 }
  const client = new tested.Client()
  const stubException = sinon.stub(appInsights.defaultClient, 'trackException')
  client.insertException(input)
  t.notOk(stubException.called)
  stubException.restore()
  t.end()
})

test('inserts throws exception', t => {
  const input = { level: 50, time: 1532081790750, msg: 'error message', pid: 9118, hostname: 'MacBook-Pro.local', type: 'Error', stack: 'Error: error message', v: 1 }
  const client = new tested.Client()
  const stubTrace = sinon.stub(appInsights.defaultClient, 'trackTrace').throws()
  const insert = client.insert(input)
  t.rejects(insert)
  stubTrace.restore()
  t.end()
})

test('calls insert without document', t => {
  const client = new tested.Client()
  client.insert().then(data => {
    t.equals(data, undefined)
    t.end()
  })
})

test('inserts multiple documents', t => {
  const input = [
    { level: 30, time: 1532081790730, msg: 'info message', pid: 9118 },
    { level: 50, time: 1532081790750, msg: 'error message', pid: 9118, type: 'Error', stack: 'Error: error message' }
  ]
  const stubTrace = sinon.stub(appInsights.defaultClient, 'trackTrace')
  const stubException = sinon.stub(appInsights.defaultClient, 'trackException')
  const client = new tested.Client()
  const insert = client.insert(input)
  t.resolves(insert)
  t.equals(stubTrace.callCount, 2)
  t.equals(stubException.callCount, 1)
  stubTrace.restore()
  stubException.restore()
  t.end()
})

test('inserts with write stream', t => {
  const stubTrace = sinon.stub(appInsights.defaultClient, 'trackTrace')
  const client = new tested.Client()
  const log = { level: 30, time: 1553862903459, pid: 23164, hostname: 'Osmonds-MacBook-Pro.local', msg: 'info message', v: 1 }
  const ws = client.insertStream()
  ws.write(log)
  ws.end()
  t.ok(stubTrace.called)
  stubTrace.restore()
  t.end()
})
