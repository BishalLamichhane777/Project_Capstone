/**
 * exportHelper.js — shared export utility for analytics screens.
 *
 * Encapsulates the fetch → base64 → write → share pipeline that
 * ExportReportsScreen already implements, so BatchOverviewScreen,
 * ClassDetailScreen, and StudentDetailScreen don't duplicate it.
 *
 * Usage:
 *   import { triggerExport } from '../utils/exportHelper';
 *
 *   await triggerExport({
 *     token,
 *     reportType: 'class_roster',
 *     format:     'excel',
 *     // scope params (only the ones relevant to the report_type):
 *     classId:    42,
 *     risk:       'at_risk',
 *     search:     'john',
 *     // optional label shown in loading / success alerts:
 *     label:      'Java — At-Risk (12 students)',
 *   });
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { API } from '../api';

const MIME = {
  csv:   'text/csv',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf:   'application/pdf',
};
const EXT = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };

/**
 * @param {object} opts
 * @param {string}  opts.token       — JWT bearer token
 * @param {string}  opts.reportType  — 'batch' | 'class_roster' | 'student'
 * @param {string}  [opts.format]    — 'csv' | 'excel' | 'pdf'  (default: 'excel')
 * @param {string}  [opts.period]    — period string (default: 'Custom Range')
 * @param {number}  [opts.batchId]
 * @param {number}  [opts.classId]
 * @param {number}  [opts.studentId]
 * @param {string}  [opts.risk]      — 'all' | 'at_risk' | 'good'
 * @param {string}  [opts.search]
 * @param {string}  [opts.label]     — human-readable label for alerts
 * @param {function} [opts.onStart]  — called when export begins (e.g. setExporting(true))
 * @param {function} [opts.onEnd]    — called when export finishes (success or error)
 */
export async function triggerExport({
  token,
  reportType,
  format    = 'excel',
  period    = 'Custom Range',
  batchId,
  classId,
  studentId,
  risk      = 'all',
  search    = '',
  label     = 'report',
  onStart,
  onEnd,
}) {
  onStart?.();

  const ext      = EXT[format]  ?? 'xlsx';
  const mimeType = MIME[format] ?? MIME.excel;
  const safeName = label.replace(/[^a-z0-9_\-. ]/gi, '_').replace(/\s+/g, '_');
  const fileName = `${safeName}.${ext}`;
  const fileUri  = FileSystem.cacheDirectory + fileName;

  try {
    const body = {
      report_type: reportType,
      format,
      period,
    };
    if (batchId   != null) body.batch_id   = batchId;
    if (classId   != null) body.class_id   = classId;
    if (studentId != null) body.student_id = studentId;
    if (risk)              body.risk        = risk;
    if (search)            body.search      = search;

    const res = await fetch(API.adminExportReport, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error ${res.status}`);
    }

    // Convert response bytes to base64 and write to device cache
    const arrayBuffer = await res.arrayBuffer();
    const bytes       = new Uint8Array(arrayBuffer);
    let   binary      = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Open OS share sheet
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Save ${format.toUpperCase()} Export`,
        UTI: ext === 'pdf' ? 'com.adobe.pdf' : 'public.data',
      });
    } else {
      Alert.alert('Export Complete', `Saved: ${fileName}`);
    }
  } catch (err) {
    Alert.alert('Export Failed', err.message || 'Something went wrong. Please try again.');
  } finally {
    onEnd?.();
  }
}
