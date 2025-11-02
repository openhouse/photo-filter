import Application from 'photo-filter-frontend/app';
import config from 'photo-filter-frontend/config/environment';
import * as QUnit from 'qunit';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start } from 'ember-qunit';
import { EventEmitter } from 'events';

const currentMax = EventEmitter.defaultMaxListeners ?? 0;
EventEmitter.defaultMaxListeners = Math.max(currentMax, 50);

setApplication(Application.create(config.APP));

setup(QUnit.assert);

start();
