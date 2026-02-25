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

        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_map -> openFragment(MapFragment.newInstance(), getString(R.string.title_map))
                R.id.nav_stashes -> openFragment(StashesFragment.newInstance(), getString(R.string.title_stashes))
                R.id.nav_journal -> openFragment(JournalFragment.newInstance(), getString(R.string.title_journal))
                R.id.nav_groups -> openFragment(GroupsFragment.newInstance(), getString(R.string.title_groups))
                else -> false
            }
        }
    }

    private fun openFragment(fragment: Fragment, title: String): Boolean {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()

        binding.toolbar.title = title
        return true
    }
}
