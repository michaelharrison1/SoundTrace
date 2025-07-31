/// <reference types="react" />

// Win95-style vertical gray lines between table columns for scan log
// Applies to tables with class 'win95-table' and adds a right border to each th/td except the last
import 'styled-components';
import type {} from 'styled-components/cssprop';

const style = document.createElement('style');
style.innerHTML = `
  .win95-table th,
  .win95-table td {
    border-right: 2px solid #b0b0b0;
  }
  .win95-table th:last-child,
  .win95-table td:last-child {
    border-right: none;
  }
`;
document.head.appendChild(style);
