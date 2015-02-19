<?php
/**
 * @var $method common_monitor_Chunk_Method
 * @var $this common_monitor_Adapter_Html
 */
$method = get_data('method');
$adapter = get_data('adapter');

$nbrCalls           = count($method->getCalls());
$nbrDuplicatedCalls = count($method->getDuplicatedCalls());
$percent = ($nbrDuplicatedCalls ? sprintf('%.2f',((100 / $nbrCalls) * $nbrDuplicatedCalls)) : 0)
?>
<div class="panel panel-<?= $nbrDuplicatedCalls ? 'danger' : 'success'; ?>">
    <div class="panel-heading">
        <h3 class="panel-title">Method : <?= $method->getMethodName() . ' : ' . $nbrCalls . '/' . $nbrDuplicatedCalls . ' (' . $percent . '%)' ?></h3>
    </div>
    <div class="panel-body">

        <?php if($nbrDuplicatedCalls) :
                    $duplicatedCalls = $adapter->getMergedDuplicatedCalls($method->getDuplicatedCalls());
        $uid = uniqid();
        $accordionMethodId = 'accordion-method-' . $uid;
        $accordionTraceId = 'accordion-trace-' . $uid;
        ?>
        <div class="panel-group" id="<?= $accordionMethodId ?>" role="tablist" aria-multiselectable="true">

            <?php $count = 1; foreach($duplicatedCalls as $hash => $calls) : $callId = $hash . '-call-' . $uid; $traceId = $hash . '-trace-' . $uid?>

            <div class="panel panel-default">
                <div class="panel-heading" role="tab" id="heading<?= $callId ?>">
                    <h4 class="panel-title">
                        <a data-toggle="collapse" data-parent="#<?= $accordionMethodId ?>" href="#<?= $callId ?>" aria-expanded="false" aria-controls="<?= $callId ?>">
                            Call #<?= $count++ ?> (<?= count($calls) . ($calls ? ' calls' : ' call') ?>)
                        </a>
                    </h4>
                </div>
                <div id="<?= $callId ?>" class="panel-collapse collapse" role="tabpanel" aria-labelledby="heading<?= $callId ?>">
                    <div class="panel-body">
                        <div class="panel-group" id="<?= $accordionTraceId ?>" role="tablist" aria-multiselectable="true">
                            <div class="panel panel-default">
                                <div class="panel-heading" role="tab" id="heading<?= $traceId ?>">
                                    <h4 class="panel-title">
                                        <a data-toggle="collapse" data-parent="#<?= $accordionTraceId ?>" href="#<?= $traceId ?>" aria-expanded="true" aria-controls="<?= $traceId ?>">
                                            Parameters :
                                        </a>
                                    </h4>
                                </div>
                                <div id="<?= $traceId ?>" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="heading<?= $traceId ?>">
                                    <div class="panel-body">
                                        <pre><?= print_r($calls[0]->getParams(), true) ?></pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
</div>

