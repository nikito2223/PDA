package io.github.nikito2223.pdaweb

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import io.github.nikito2223.pdaweb.databinding.ActivityMainBinding
import io.github.nikito2223.pdaweb.ui.fragments.GroupsFragment
import io.github.nikito2223.pdaweb.ui.fragments.JournalFragment
import io.github.nikito2223.pdaweb.ui.fragments.MapFragment
import io.github.nikito2223.pdaweb.ui.fragments.StashesFragment

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (savedInstanceState == null) {
            openFragment(MapFragment.newInstance(), getString(R.string.title_map))
        }

        binding.menuMap.setOnClickListener { openFragment(MapFragment.newInstance(), getString(R.string.title_map)) }
        binding.menuStashes.setOnClickListener { openFragment(StashesFragment.newInstance(), getString(R.string.title_stashes)) }
        binding.menuJournal.setOnClickListener { openFragment(JournalFragment.newInstance(), getString(R.string.title_journal)) }
        binding.menuGroups.setOnClickListener { openFragment(GroupsFragment.newInstance(), getString(R.string.title_groups)) }
    }

    private fun openFragment(fragment: Fragment, title: String): Boolean {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()

        binding.toolbarTitle.text = title
        return true
    }
}
