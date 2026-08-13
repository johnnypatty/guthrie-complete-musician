(function (root) {
  'use strict';

  function bootstrap() {
    root.AppShell.create({ window: root, document: root.document }).init();
  }

  root.document.addEventListener('DOMContentLoaded', bootstrap);
})(globalThis);
