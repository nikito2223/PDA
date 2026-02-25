package io.github.nikito2223.pdaweb.ui.fragments

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.location.Location
import android.location.LocationManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import io.github.nikito2223.pdaweb.R
import io.github.nikito2223.pdaweb.data.Stash
import io.github.nikito2223.pdaweb.data.SupabaseRepository
import io.github.nikito2223.pdaweb.databinding.FragmentMapBinding
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.XYTileSource
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import org.osmdroid.events.MapEventsReceiver

class MapFragment : Fragment() {

    private var _binding: FragmentMapBinding? = null
    private val binding get() = _binding!!
    private val repository = SupabaseRepository()

    private val customMarkers = mutableMapOf<String, Stash>()
    private var mapStyle = MapStyle.NORMAL
    private var currentLocationMode = LocationMode.DOROGOBUZH
    private var currentMode = MapMode.OVERVIEW
    private var navigationEnabled = false
    private var routeLine: Polyline? = null

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {}

    private val satelliteTile = XYTileSource(
        "EsriSat",
        0,
        19,
        256,
        ".jpg",
        arrayOf("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/"),
        "© Esri"
    )

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMapBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Configuration.getInstance().userAgentValue = requireContext().packageName

        setupMap()
        setupControls()
        loadMarkersFromServer()
        loadLocalMarkers()
    }

    private fun setupMap() {
        with(binding.mapView) {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(13.5)
            controller.setCenter(currentLocationMode.center)
            minZoomLevel = 5.0
            maxZoomLevel = 19.0
        }

        val eventsOverlay = MapEventsOverlay(object : MapEventsReceiver {
            override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean = false

            override fun longPressHelper(p: GeoPoint?): Boolean {
                if (p != null && currentMode == MapMode.CREATE_MARKER) {
                    showCreateMarkerDialog(p)
                    return true
                }
                return false
            }
        })
        binding.mapView.overlays.add(eventsOverlay)
    }

    private fun setupControls() = with(binding) {
        refreshButton.setOnClickListener {
            loadMarkersFromServer()
        }

        styleButton.setOnClickListener {
            mapStyle = if (mapStyle == MapStyle.NORMAL) MapStyle.SATELLITE else MapStyle.NORMAL
            applyMapStyle()
        }

        locationButton.setOnClickListener {
            currentLocationMode = if (currentLocationMode == LocationMode.DOROGOBUZH) LocationMode.CHERNOBYL else LocationMode.DOROGOBUZH
            mapView.controller.animateTo(currentLocationMode.center)
            mapView.controller.setZoom(currentLocationMode.zoom)
            locationButton.text = "Локация: ${currentLocationMode.title}"
        }

        modeButton.setOnClickListener {
            currentMode = if (currentMode == MapMode.OVERVIEW) MapMode.CREATE_MARKER else MapMode.OVERVIEW
            modeButton.text = if (currentMode == MapMode.CREATE_MARKER) "Режим: СОЗДАНИЕ" else "Режим: ОБЗОР"
            hintText.text = if (currentMode == MapMode.CREATE_MARKER) {
                "Долгое нажатие — создать метку"
            } else {
                "Тап по метке — действия (редактировать/удалить/навигация)"
            }
        }

        navButton.setOnClickListener {
            navigationEnabled = !navigationEnabled
            navButton.text = if (navigationEnabled) "Навигатор: ВКЛ" else "Навигатор: ВЫКЛ"
            if (!navigationEnabled) clearRoute()
        }
    }

    private fun applyMapStyle() {
        if (mapStyle == MapStyle.SATELLITE) {
            binding.mapView.setTileSource(satelliteTile)
            binding.styleButton.text = "Стиль: Спутник"
        } else {
            binding.mapView.setTileSource(TileSourceFactory.MAPNIK)
            binding.styleButton.text = "Стиль: Обычная"
        }
        binding.mapView.invalidate()
    }

    private fun loadMarkersFromServer() {
        binding.progress.visibility = View.VISIBLE
        clearMarkers(keepUserMarkers = true)

        viewLifecycleOwner.lifecycleScope.launch {
            val stashes = repository.loadStashes()
            stashes.forEach { addMarker(it, isUserMarker = false) }
            binding.progress.visibility = View.GONE
            binding.emptyState.visibility = if (stashes.isEmpty() && customMarkers.isEmpty()) View.VISIBLE else View.GONE
        }
    }

    private fun addMarker(stash: Stash, isUserMarker: Boolean) {
        val marker = Marker(binding.mapView)
        marker.position = GeoPoint(stash.lat, stash.lng)
        marker.title = stash.name
        marker.subDescription = "${stash.type}: ${stash.description}"
        marker.icon = markerIconByType(stash.type)
        marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)

        marker.setOnMarkerClickListener { m, _ ->
            m.showInfoWindow()
            showMarkerActions(stash, isUserMarker)
            true
        }

        binding.mapView.overlays.add(marker)
        binding.mapView.invalidate()
    }

    private fun showMarkerActions(stash: Stash, isUserMarker: Boolean) {
        val base = mutableListOf("Навигация к точке")
        if (isUserMarker) {
            base += "Редактировать"
            base += "Удалить"
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(stash.name)
            .setItems(base.toTypedArray()) { _, which ->
                when (base[which]) {
                    "Навигация к точке" -> {
                        if (!navigationEnabled) {
                            Toast.makeText(requireContext(), "Включи навигатор", Toast.LENGTH_SHORT).show()
                        } else {
                            startNavigationTo(stash)
                        }
                    }
                    "Редактировать" -> showEditMarkerDialog(stash)
                    "Удалить" -> removeUserMarker(stash.id)
                }
            }
            .show()
    }

    private fun showCreateMarkerDialog(point: GeoPoint) {
        val view = layoutInflater.inflate(R.layout.view_marker_form, null)
        val nameInput = view.findViewById<EditText>(R.id.markerName)
        val descInput = view.findViewById<EditText>(R.id.markerDescription)
        val typeInput = view.findViewById<EditText>(R.id.markerType)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Создать метку")
            .setView(view)
            .setPositiveButton("Сохранить") { _, _ ->
                val stash = Stash(
                    id = "user_${System.currentTimeMillis()}",
                    name = nameInput.text.toString().ifBlank { "Новая метка" },
                    description = descInput.text.toString().ifBlank { "Нет описания" },
                    lat = point.latitude,
                    lng = point.longitude,
                    type = typeInput.text.toString().ifBlank { "stash" },
                    createdAt = null
                )
                customMarkers[stash.id] = stash
                addMarker(stash, isUserMarker = true)
                saveLocalMarkers()
            }
            .setNegativeButton("Отмена", null)
            .show()
    }

    private fun showEditMarkerDialog(stash: Stash) {
        val view = layoutInflater.inflate(R.layout.view_marker_form, null)
        val nameInput = view.findViewById<EditText>(R.id.markerName)
        val descInput = view.findViewById<EditText>(R.id.markerDescription)
        val typeInput = view.findViewById<EditText>(R.id.markerType)

        nameInput.setText(stash.name)
        descInput.setText(stash.description)
        typeInput.setText(stash.type)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Редактировать метку")
            .setView(view)
            .setPositiveButton("Сохранить") { _, _ ->
                customMarkers[stash.id] = stash.copy(
                    name = nameInput.text.toString().ifBlank { stash.name },
                    description = descInput.text.toString().ifBlank { stash.description },
                    type = typeInput.text.toString().ifBlank { stash.type }
                )
                redrawAllMarkers()
                saveLocalMarkers()
            }
            .setNegativeButton("Отмена", null)
            .show()
    }

    private fun redrawAllMarkers() {
        clearMarkers(keepUserMarkers = false)
        viewLifecycleOwner.lifecycleScope.launch {
            repository.loadStashes().forEach { addMarker(it, false) }
            customMarkers.values.forEach { addMarker(it, true) }
        }
    }

    private fun clearMarkers(keepUserMarkers: Boolean) {
        binding.mapView.overlays.removeAll { overlay ->
            overlay is Marker
        }
        if (!keepUserMarkers) customMarkers.clear()
    }

    private fun removeUserMarker(id: String) {
        customMarkers.remove(id)
        redrawAllMarkers()
        saveLocalMarkers()
    }

    private fun saveLocalMarkers() {
        val arr = JSONArray()
        customMarkers.values.forEach {
            arr.put(JSONObject().apply {
                put("id", it.id)
                put("name", it.name)
                put("description", it.description)
                put("lat", it.lat)
                put("lng", it.lng)
                put("type", it.type)
            })
        }
        requireContext().getSharedPreferences("pda_markers", 0).edit {
            putString("markers", arr.toString())
        }
    }

    private fun loadLocalMarkers() {
        val json = requireContext().getSharedPreferences("pda_markers", 0).getString("markers", null) ?: return
        runCatching {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val it = arr.getJSONObject(i)
                val stash = Stash(
                    id = it.getString("id"),
                    name = it.getString("name"),
                    description = it.getString("description"),
                    lat = it.getDouble("lat"),
                    lng = it.getDouble("lng"),
                    type = it.getString("type"),
                    createdAt = null
                )
                customMarkers[stash.id] = stash
                addMarker(stash, isUserMarker = true)
            }
        }
    }

    private fun startNavigationTo(stash: Stash) {
        val startPoint = getCurrentOrCenterPoint()
        val endPoint = GeoPoint(stash.lat, stash.lng)

        clearRoute()
        routeLine = Polyline().apply {
            setPoints(listOf(startPoint, endPoint))
            outlinePaint.color = ContextCompat.getColor(requireContext(), R.color.neon_green)
            outlinePaint.strokeWidth = 8f
        }
        binding.mapView.overlays.add(routeLine)
        binding.mapView.controller.animateTo(endPoint)

        val distance = startPoint.distanceToAsDouble(endPoint) / 1000.0
        Toast.makeText(requireContext(), "Маршрут до ${stash.name}: ${"%.2f".format(distance)} км", Toast.LENGTH_LONG).show()
        binding.mapView.invalidate()
    }

    private fun clearRoute() {
        routeLine?.let { binding.mapView.overlays.remove(it) }
        routeLine = null
        binding.mapView.invalidate()
    }

    @SuppressLint("MissingPermission")
    private fun getCurrentOrCenterPoint(): GeoPoint {
        val hasFine = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasFine && !hasCoarse) {
            permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            return GeoPoint(binding.mapView.mapCenter)
        }

        val locationManager = requireContext().getSystemService(LocationManager::class.java)
        val providers = locationManager.getProviders(true)
        var best: Location? = null
        providers.forEach { p ->
            val l = runCatching { locationManager.getLastKnownLocation(p) }.getOrNull()
            if (l != null && (best == null || l.accuracy < best!!.accuracy)) best = l
        }

        return best?.let { GeoPoint(it.latitude, it.longitude) } ?: GeoPoint(binding.mapView.mapCenter)
    }

    private fun markerIconByType(type: String): Drawable? {
        val iconRes = when (type.lowercase()) {
            "quest" -> android.R.drawable.ic_menu_compass
            "danger" -> android.R.drawable.ic_delete
            "anomaly" -> android.R.drawable.ic_dialog_alert
            else -> android.R.drawable.star_big_on
        }
        return ContextCompat.getDrawable(requireContext(), iconRes)
    }

    override fun onResume() {
        super.onResume()
        binding.mapView.onResume()
    }

    override fun onPause() {
        binding.mapView.onPause()
        super.onPause()
    }

    override fun onDestroyView() {
        clearRoute()
        binding.mapView.onDetach()
        _binding = null
        super.onDestroyView()
    }

    companion object {
        fun newInstance() = MapFragment()
    }
}

private enum class MapStyle { NORMAL, SATELLITE }
private enum class MapMode { OVERVIEW, CREATE_MARKER }

private enum class LocationMode(val title: String, val center: GeoPoint, val zoom: Double) {
    DOROGOBUZH("Дорогобуж", GeoPoint(54.9145, 33.3030), 13.5),
    CHERNOBYL("Чернобыль", GeoPoint(51.3890, 30.0994), 12.0)
}
