import { useEffect, useRef, useState } from 'react';
import { db, uuid } from '../services/db.js';
import { getPosition, toLocationObject } from '../services/geolocation.js';
import { startCamera, stopCamera, captureFrame, filesToPhotos } from '../services/camera.js';
import { useSensors, requestSensorsPermission } from '../hooks/useSensors.js';
import { pickContact } from '../services/contacts.js';
import { CATEGORIES, getCategory } from '../services/categories.js';

/**
 * "Create" + "Update" parts of CRUD.
 * Integrates every device API required by the brief:
 *   Geolocation (capture GPS + heading + tilt in one shot),
 *   Camera (live capture + photo album),
 *   Compass/Accelerometer (live orientation display, iOS permission button),
 *   Contacts (recipient picker with manual fallback).
 */
export default function ReportForm({ editing = null, onDone }) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [category, setCategory] = useState(editing?.category ?? CATEGORIES[0].id);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [recipient, setRecipient] = useState(editing?.recipient ?? '');
  const [photos, setPhotos] = useState(editing?.photos ?? []);
  const [location, setLocation] = useState(editing?.location ?? null);
  const [locating, setLocating] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState('');

  const { heading, tilt } = useSensors();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const albumRef = useRef(null);

  const cat = getCategory(category);

  // Release the camera when the form unmounts (e.g. user navigates away).
  useEffect(() => () => stopCamera(videoRef.current), []);

  function updateCategory(id) {
    setCategory(id);
    // Keep the recipient hint in sync with the chosen category.
    if (!recipient) {
      const next = getCategory(id);
      // placeholder is derived during render, nothing else to do here
      void next;
    }
  }

  async function handleCaptureLocation() {
    setLocating(true);
    setError('');
    try {
      const position = await getPosition();
      // Compass heading + accelerometer tilt are captured at the same moment.
      setLocation(toLocationObject(position, { heading, tilt }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  }

  async function handleStartCamera() {
    setError('');
    try {
      await startCamera(videoRef.current);
      setCameraOn(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleTakePhoto() {
    const dataUrl = captureFrame(videoRef.current, canvasRef.current);
    if (!dataUrl) {
      setError('Start the camera first.');
      return;
    }
    setPhotos((ps) => [...ps, dataUrl]);
  }

  async function handleAlbumChange(e) {
    setError('');
    try {
      const added = await filesToPhotos(e.target.files);
      setPhotos((ps) => [...ps, ...added]);
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = ''; // allow picking the same file again later
    }
  }

  function removePhoto(index) {
    setPhotos((ps) => ps.filter((_, i) => i !== index));
  }

  async function handlePickContact() {
    setError('');
    try {
      const contact = await pickContact();
      if (contact) setRecipient(contact);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEnableSensors() {
    setError('');
    try {
      await requestSensorsPermission(); // iOS 13+ gesture-gated prompt
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const now = new Date().toISOString(); // datetime stamp

    await db.reports.put({
      id: editing?.id ?? uuid(),
      title: title.trim(),
      category,
      description: description.trim(),
      recipient: recipient.trim(),
      photos,
      location,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
      syncStatus: editing ? 'modified' : 'new',
    });

    onDone(); // back to the list (Dexie live query refreshes it automatically)
  }

  return (
    <section aria-label="Report form">
      <h2>{editing ? '✏️ Edit report' : '➕ New report'}</h2>

      {error && <p className="error-text" role="alert">⚠️ {error}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Broken fence near gate 4"
            required
          />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => updateCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Description
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you find? Include details the recipient will need."
          />
        </label>

        <fieldset>
          <legend>📍 Location — Geolocation API</legend>
          <p className="report-meta">
            {location
              ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (±${Math.round(location.accuracy || 0)}m)` +
                (location.heading != null ? ` · heading ${Math.round(location.heading)}°` : '') +
                (location.tilt ? ` · camera ${location.tilt.direction}` : '')
              : locating
                ? 'Locating…'
                : 'Not captured yet.'}
          </p>
          <button type="button" onClick={handleCaptureLocation} disabled={locating}>
            {locating ? 'Locating…' : 'Capture GPS position'}
          </button>
        </fieldset>

        <fieldset>
          <legend>📷 Photos — Camera API</legend>
          <video ref={videoRef} className={`camera-preview ${cameraOn ? 'on' : ''}`} playsInline muted />
          <canvas ref={canvasRef} hidden />
          <div className="btn-row">
            <button type="button" onClick={handleStartCamera}>
              Start camera
            </button>
            <button type="button" onClick={handleTakePhoto}>
              Take photo
            </button>
          </div>
          {/* The native <input type="file"> renders a browser-locale button
              (e.g. "选择文件" on a Chinese OS). It is hidden and triggered by
              the styled button below, keeping the UI language consistent. */}
          <button type="button" onClick={() => albumRef.current?.click()}>
            🖼️ Choose from photo album
          </button>
          <input
            ref={albumRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleAlbumChange}
          />
          {photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((src, i) => (
                <div key={i} className="thumb-wrap">
                  <img src={src} alt={`Photo ${i + 1}`} />
                  <button
                    type="button"
                    className="thumb-remove"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => removePhoto(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>🧭 Orientation — Compass + Accelerometer API</legend>
          <p className="report-meta">Heading: {heading == null ? '–' : `${Math.round(heading)}°`}</p>
          <p className="report-meta">
            Tilt: {tilt ? `${tilt.angle}° · camera pointing ${tilt.direction}` : '–'}
          </p>
          <button type="button" onClick={handleEnableSensors}>
            Enable sensors (iOS)
          </button>
        </fieldset>

        <fieldset>
          <legend>✉️ Recipient — Contacts API</legend>
          <button type="button" onClick={handlePickContact}>
            Pick a contact
          </button>
          <label>
            Send report to
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={cat?.recipientHint ? `e.g. ${cat.recipientHint}` : 'Name <email> or phone number'}
            />
          </label>
        </fieldset>

        <div className="btn-row">
          <button type="submit" className="primary">
            💾 Save report
          </button>
          <button type="button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
