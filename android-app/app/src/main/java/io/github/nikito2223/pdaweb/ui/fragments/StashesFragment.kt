package io.github.nikito2223.pdaweb.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import io.github.nikito2223.pdaweb.data.SupabaseRepository
import io.github.nikito2223.pdaweb.databinding.FragmentStashesBinding
import io.github.nikito2223.pdaweb.ui.adapters.StashAdapter
import kotlinx.coroutines.launch

class StashesFragment : Fragment() {

    private var _binding: FragmentStashesBinding? = null
    private val binding get() = _binding!!
    private val repository = SupabaseRepository()
    private val adapter = StashAdapter()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentStashesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.list.layoutManager = LinearLayoutManager(requireContext())
        binding.list.adapter = adapter
        binding.swipe.setOnRefreshListener { loadStashes() }
        loadStashes()
    }

    private fun loadStashes() {
        binding.swipe.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            val stashes = repository.loadStashes()
            adapter.submitList(stashes)
            binding.emptyState.visibility = if (stashes.isEmpty()) View.VISIBLE else View.GONE
            binding.swipe.isRefreshing = false
        }
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }

    companion object {
        fun newInstance() = StashesFragment()
    }
}
