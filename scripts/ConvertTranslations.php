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
 * Copyright (c) 2021 (original work) Open Assessment Technologies SA;
 */

declare(strict_types=1);

namespace oat\taoDevTools\scripts;

use common_exception_Error;
use common_report_Report;
use oat\oatbox\extension\script\ScriptAction;
use oat\oatbox\reporting\Report;

/**
 * Class ConvertTranslations
 *
 * @package oat\taoDevTools\scripts
 *
 * @example php index.php "oat\taoDevTools\scripts\ConvertTranslations" --extension=taoDevTools --legacyFile taoDevTools/locales/en-US/messages.po --newFile taoDevTools/locales/messages.en.yaml
 */
class ConvertTranslations extends ScriptAction
{
    /**
     * @return array
     */
    protected function provideOptions()
    {
        return [
            'legacyFile' => [
                'prefix' => 'l',
                'longPrefix' => 'legacyFile',
                'required' => true,
                'description' => 'Path to the outdated translation file.'
            ],
            'newFile' => [
                'prefix' => 'n',
                'longPrefix' => 'newFile',
                'required' => true,
                'description' => 'Path to new translation file.'
            ],
            'extension' => [
                'prefix' => 'e',
                'longPrefix' => 'extension',
                'required' => true,
                'description' => 'Translatable extension.'
            ],
        ];
    }

    /**
     * @return string
     */
    protected function provideDescription()
    {
        return 'Use this script to convert old translations to new format translations.';
    }

    /**
     * @return common_report_Report|Report
     * @throws common_exception_Error
     */
    protected function run()
    {
        $legacyFileLines = file($this->getOption('legacyFile'));

        $arrayTranslates = [];

        $msgidNonConverted = '';
        $msgid = '';
        $flagMsgid = false;

        foreach ($legacyFileLines as $line) {

            if ($flagMsgid === false) {
                if (strpos($line, 'msgid') !== false) {
                    $msgid = trim(strstr($line, '"'), '"');
                    $msgid = str_replace(['>', '.', '_', ':', '/n', '%s', '/', '\\', '\n', '"', '(', ')', '?', '!', ','], '', $msgid);
                    $msgid = str_replace('extension', 'ext', $msgid);
                    $msgid = mb_strtolower($msgid);
                    $msgid = trim($msgid);
                    $msgid = str_replace(" ", "_", $msgid);
                    $msgid = str_replace("__", "_", $msgid);

                    if ($msgid === '') {
                        continue;
                    }

                    $msgidNonConverted = trim(strstr($line, '"'));
                    $flagMsgid = true;
                }
            } else {
                if (strpos($line, 'msgstr') !== false) {

                    $msgstr = trim(strstr($line, '"'));
                    $msgstr = $msgstr !== '""' ? $msgstr : $msgidNonConverted;
                    $msgstr = str_replace('%s', '%{parameter}', $msgstr);

                    $arrayTranslates[$msgid] = $msgstr !== '""' ? $msgstr : $msgidNonConverted;

                    $msgid = '';
                    $msgidNonConverted = '';
                    $flagMsgid = false;
                }
            }
        }

        $fp = fopen($this->getOption('newFile'), "w+");

        fwrite($fp, $this->getOption('extension') . ':' . PHP_EOL);

        foreach ($arrayTranslates as $key => $value) {
            fwrite($fp, "  $key: $value" . PHP_EOL);
        }

        return new Report(Report::TYPE_SUCCESS, 'Translations successfully converted.');
    }

}
