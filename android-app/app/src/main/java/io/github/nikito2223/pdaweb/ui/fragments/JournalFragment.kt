package io.github.nikito2223.pdaweb.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import io.github.nikito2223.pdaweb.data.JournalEntry
import io.github.nikito2223.pdaweb.databinding.FragmentJournalBinding
import io.github.nikito2223.pdaweb.ui.adapters.JournalAdapter

class JournalFragment : Fragment() {

    private var _binding: FragmentJournalBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentJournalBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val adapter = JournalAdapter()
        binding.list.layoutManager = LinearLayoutManager(requireContext())
        binding.list.adapter = adapter
        adapter.submitList(
            listOf(
                JournalEntry("12.08.2023 - 14:30", "Обнаружил аномалию \"Жарка\" у заброшенной фермы. Будьте осторожны, братья."),
                JournalEntry("11.08.2023 - 09:15", "Схрон с припасами в подвале разрушенного дома. Код замка: 4321."),
                JournalEntry("10.08.2023 - 22:10", "На юге замечены бойцы неизвестной группировки. Держитесь северных троп.")
            )
        )
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }

    companion object {
        fun newInstance() = JournalFragment()
    }
}
