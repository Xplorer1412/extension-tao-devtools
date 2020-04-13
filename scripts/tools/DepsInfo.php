<?php

/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2017 (original work) Open Assessment Technologies SA;
 *
 */

namespace oat\taoDevTools\scripts\tools;

use oat\oatbox\extension\script\ScriptAction;
use DirectoryIterator;
use common_report_Report as Report;

class DepsInfo extends ScriptAction
{
    private $namespaceMap = [
        'oatbox' => 'generis'
    ];

    /**
     * Provides the title of the script.
     *
     * @return string
     */
    protected function provideDescription()
    {
        $message = 'Analyzer of Tao extension dependencies' . PHP_EOL;

        return $message;
    }

    /**
     * Provides the possible options.
     *
     * @return array
     */
    protected function provideOptions()
    {
        return [
            'render'   => [
                'prefix'       => 'r',
                'longPrefix'   => 'render',
                'required' => false,
                'flag' => true,
                'description'  => 'Return HTML rendered table as a result',
                'defaultValue' => false
            ],
            'extension'       => [
                'prefix'       => 'e',
                'longPrefix'   => 'extension',
                'cast'         => 'string',
                'required'     => false,
                'description'  => 'Analyze given extension. All extensions analyzed if not given',
                'defaultValue' => ''
            ]
        ];
    }

    public function run()
    {
        $result = $this->getDeps();
        $this->checkСyclicDep($result);

        if ($this->getOption('render')) {
            $result = $this->render($result);
        }
        return Report::createInfo('Extension dependencies analyzed.', $result);
    }

    /**
     * @return array
     */
    private function getDeps()
    {
        if ($this->getOption('extension')) {
            $extRoot = new \SplFileInfo(ROOT_PATH.$this->getOption('extension'));
            $result = $this->getExtensionDeps($extRoot);
        } else {
            $result = [];
            foreach (new DirectoryIterator(ROOT_PATH) as $fileInfo) {
                if ($fileInfo->isDot()) {
                    continue;
                }
                $manifest = $this->getManifest($fileInfo);
                if ($manifest === null) {
                    continue;
                }
                $result = array_merge($result, $this->getExtensionDeps($fileInfo));
            }
        }
        return $result;
    }

    private function getExtensionDeps(\SplFileInfo $fileInfo)
    {
        $result = [];
        $manifest = $this->getManifest($fileInfo);
        $classes = $this->getDependClasses($fileInfo);
        sort($classes);
        $extensions = [];
        foreach ($classes as $class) {
            $extensions[] = $this->classToExtensionId($class);
        }
        $extensions = array_unique($extensions);
        $extensions = array_filter($extensions);
        $extensions = array_diff($extensions, [$manifest['name']]);
        sort($extensions);
        if (isset($manifest['requires']) && is_array($manifest['requires'])) {
            $manifestDeps = array_keys($manifest['requires']);
            sort($manifestDeps);
        } else {
            $manifestDeps = [];
        }
        $result[$manifest['name']] = [
            'classes' => $classes,
            'manifestDeps' => $manifestDeps,
            'realDeps' => $extensions
        ];
        return $result;
    }

    /**
     * @param $result
     * @return string
     */
    private function render($result)
    {
        $resultHtml = '<style>
table, th, td {
  border: 1px solid black;
  font-family: monospace;
}
.classlist {
font-size: 12px;
max-height: 150px;
overflow-y: scroll;
}
.missed {
color: darkred;
}
</style>';
        $resultHtml .='<table><tr>
<th>Extension ID</th>
<th>Used Classes</th>
<th>Dependencies in manifest</th>
<th>Real dependencies</th>
<th>Redundant (Mentioned in manifest but not used)</th>
<th>Missed (Not mentioned in manifest but used in code)</th>
<th>Cyclic dependencies</th>
</tr>';
        foreach ($result as $extId => $row) {
            $redundant = array_diff($row['manifestDeps'], $row['realDeps']);
            $notMentioned = array_diff($row['realDeps'], $row['manifestDeps']);
            $classes = $row['classes'];
            $resultHtml .= '<tr>
                <td>'.$extId.'</td>
                <td><div class="classlist">'.implode('<br>', $classes).'</div></td>
                <td>'.implode('<br>', $row['manifestDeps']).'</td>
                <td>'.implode('<br>', $row['realDeps']).'</td>
                <td>'.implode('<br>', $redundant).'</td>
                <td><div class="missed">'.implode('<br>', $notMentioned).'</div></td>
                <td><div class="missed">'.implode('<br>', $row['cyclicDeps']).'</div></td>
                </tr>';
        }
        $resultHtml .=  '</table>';

        return $resultHtml;
    }

    /**
     * @param DirectoryIterator $fileInfo
     * @return mixed|null
     */
    private function getManifest(DirectoryIterator $fileInfo)
    {
        $path = $fileInfo->getRealPath().DIRECTORY_SEPARATOR.'manifest.php';
        if (file_exists($path)) {
            return require $path;
        }
        return null;
    }

    /**
     * @param DirectoryIterator $fileInfo
     * @return string|null
     */
    private function getDependClasses(DirectoryIterator $fileInfo)
    {
        $result = [];
        $dependencies = shell_exec('dephpend.bat text '.$fileInfo);
        $dependenciesArray = preg_split("/\r\n|\n|\r/", $dependencies);
        $dependenciesArray = array_filter($dependenciesArray);
        foreach ($dependenciesArray as $dependency) {
            $dependencyClass = explode(' --> ', $dependency);
            $result[] = $dependencyClass[1];
        }
        return array_unique($result);
    }

    /**
     * @param string $class
     * @return mixed|null
     */
    private function classToExtensionId(string $class)
    {
        preg_match('/oat\\\([a-zA-Z]+).*/', $class, $matches);

        if (isset($matches[1])) {
            return $this->mapNamespace($matches[1]);
        }
        return null;
    }

    /**
     * @param $namespace
     * @return bool
     */
    private function mapNamespace($namespace)
    {
        return isset($this->namespaceMap[$namespace]) ? $this->namespaceMap[$namespace] : $namespace;
    }

    /**
     * @param $deps
     */
    private function checkСyclicDep(&$deps):void
    {
        foreach ($deps as $extId => &$extDeps) {
            $extDeps['cyclicDeps'] = [];
            foreach ($extDeps['realDeps'] as $extDep) {
                if (isset($deps[$extDep]) && in_array($extId, $deps[$extDep]['realDeps'])) {
                    $extDeps['cyclicDeps'][] = $extDep;
                }
            }
        }
    }
}
