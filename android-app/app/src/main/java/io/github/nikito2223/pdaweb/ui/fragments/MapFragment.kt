package io.github.nikito2223.pdaweb.ui.fragments

import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import io.github.nikito2223.pdaweb.R
import io.github.nikito2223.pdaweb.data.Stash
import io.github.nikito2223.pdaweb.data.SupabaseRepository
import io.github.nikito2223.pdaweb.databinding.FragmentMapBinding
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.overlay.Marker

class MapFragment : Fragment() {

    private var _binding: FragmentMapBinding? = null
    private val binding get() = _binding!!
    private val repository = SupabaseRepository()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMapBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Configuration.getInstance().userAgentValue = requireContext().packageName

        with(binding.mapView) {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(14.0)
            controller.setCenter(GeoPoint(54.9145, 33.3030))
        }

        binding.refreshButton.setOnClickListener { loadMarkers() }
        loadMarkers()
    }

    private fun loadMarkers() {
        binding.progress.visibility = View.VISIBLE
        binding.mapView.overlays.removeAll { it is Marker }

        viewLifecycleOwner.lifecycleScope.launch {
            val stashes = repository.loadStashes()
            stashes.forEach { stash -> addMarker(stash) }
            binding.progress.visibility = View.GONE
            binding.emptyState.visibility = if (stashes.isEmpty()) View.VISIBLE else View.GONE
        }
    }

    private fun addMarker(stash: Stash) {
        val marker = Marker(binding.mapView)
        marker.position = GeoPoint(stash.lat, stash.lng)
        marker.title = stash.name
        marker.subDescription = "${stash.type}: ${stash.description}"
        marker.icon = markerIconByType(stash.type)
        marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
        binding.mapView.overlays.add(marker)
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
        binding.mapView.onDetach()
        _binding = null
        super.onDestroyView()
    }

    companion object {
        fun newInstance() = MapFragment()
    }
}
